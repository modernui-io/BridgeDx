import argparse
import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple, Optional

import requests

try:
    import fitz  # pymupdf
except Exception as exc:  # pragma: no cover - handled in tests by skipping if missing
    fitz = None

try:
    import pdfplumber
except Exception as exc:  # pragma: no cover - handled in tests by skipping if missing
    pdfplumber = None


@dataclass
class Span:
    span_id: str
    page: int
    bbox: Tuple[float, float, float, float]
    text: str
    span_type: str
    confidence: float
    extraction_method: str


COLOR_LABELS = {
    "red": (1.0, 0.0, 0.0),
    "yellow": (1.0, 1.0, 0.0),
    "green": (0.0, 1.0, 0.0),
    "orange": (1.0, 0.5, 0.0),
}

CLASSIFICATION_KEYWORDS = [
    "SEVERE",
    "VERY SEVERE",
    "PNEUMONIA",
    "DYSENTERY",
    "MALARIA",
    "MEASLES",
    "DIARRHOEA",
    "DIARRHEA",
    "DEHYDRATION",
    "MALNUTRITION",
    "ANAEMIA",
    "ANEMIA",
    "LOW WEIGHT",
    "NO",
    "SOME",
    "PERSISTENT",
]

TREATMENT_VERBS = ["GIVE", "TREAT", "REFER", "ADVISE", "RETURN", "FOLLOW", "START", "PROVIDE"]


def download_pdf(url: str, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    out_path.write_bytes(resp.content)


def _rgb_from_int(color_int: int) -> Tuple[float, float, float]:
    r = ((color_int >> 16) & 255) / 255.0
    g = ((color_int >> 8) & 255) / 255.0
    b = (color_int & 255) / 255.0
    return (r, g, b)


def _color_label(rgb: Tuple[float, float, float]) -> str:
    for name, ref in COLOR_LABELS.items():
        if sum((rgb[i] - ref[i]) ** 2 for i in range(3)) < 0.1:
            return name
    return "unknown"


def _is_all_caps(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return False
    return all(c.isupper() for c in letters)


def _span_type(text: str, font_size: float, median_size: float, color_label: str) -> str:
    norm = text.strip()
    upper = norm.upper()
    if not norm:
        return "note"
    if font_size >= median_size * 1.3 and len(norm) <= 80:
        return "heading"
    if color_label in {"red", "yellow", "green", "orange"}:
        return "color_label"
    if _is_all_caps(norm) and any(k in upper for k in CLASSIFICATION_KEYWORDS):
        return "classification"
    if any(upper.startswith(v) or f" {v} " in f" {upper} " for v in TREATMENT_VERBS):
        return "treatment"
    if "IF " in upper or upper.startswith("IF ") or "?" in norm or "CHECK" in upper:
        return "condition"
    if "CLASSIFY" in upper or "ASSESS" in upper:
        return "flow_node"
    return "note"


def extract_spans(pdf_path: Path) -> List[Span]:
    if fitz is None:
        raise RuntimeError("pymupdf (fitz) is not available")

    spans: List[Span] = []
    doc = fitz.open(pdf_path)
    for page_index in range(doc.page_count):
        page = doc[page_index]
        text_dict = page.get_text("dict")
        sizes = []
        for block in text_dict.get("blocks", []):
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    sizes.append(span.get("size", 0))
        median_size = sorted(sizes)[len(sizes) // 2] if sizes else 0

        for block in text_dict.get("blocks", []):
            for line in block.get("lines", []):
                line_text_parts = [s.get("text", "") for s in line.get("spans", [])]
                line_text = "".join(line_text_parts).strip()
                if not line_text:
                    continue
                line_bbox = line.get("bbox", block.get("bbox"))
                span_sizes = [s.get("size", median_size) for s in line.get("spans", [])]
                font_size = sum(span_sizes) / max(len(span_sizes), 1)
                color_int = line.get("spans", [{}])[0].get("color", 0)
                rgb = _rgb_from_int(color_int)
                color_label = _color_label(rgb)
                span_type = _span_type(line_text, font_size, median_size, color_label)
                span_id = f"span_{page_index+1}_{len(spans)+1}"
                spans.append(
                    Span(
                        span_id=span_id,
                        page=page_index + 1,
                        bbox=tuple(line_bbox),
                        text=line_text,
                        span_type=span_type,
                        confidence=0.7 if span_type != "note" else 0.5,
                        extraction_method="pymupdf_text",
                    )
                )
    doc.close()
    return spans


def extract_table_cells(pdf_path: Path) -> List[Span]:
    if pdfplumber is None:
        raise RuntimeError("pdfplumber is not available")

    spans: List[Span] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_index, page in enumerate(pdf.pages):
            tables = page.find_tables(
                {
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "lines",
                    "intersection_tolerance": 5,
                    "snap_tolerance": 3,
                    "join_tolerance": 3,
                }
            )
            for table in tables:
                for cell in table.cells:
                    if cell is None:
                        continue
                    if isinstance(cell, dict):
                        bbox = (cell["x0"], cell["top"], cell["x1"], cell["bottom"])
                    else:
                        bbox = cell
                    page_bbox = page.bbox
                    x0 = max(page_bbox[0], min(page_bbox[2], bbox[0]))
                    y0 = max(page_bbox[1], min(page_bbox[3], bbox[1]))
                    x1 = max(page_bbox[0], min(page_bbox[2], bbox[2]))
                    y1 = max(page_bbox[1], min(page_bbox[3], bbox[3]))
                    norm_bbox = (x0, y0, x1, y1)
                    text = page.crop(norm_bbox, strict=False).extract_text(x_tolerance=1, y_tolerance=1) or ""
                    text = " ".join(text.split())
                    if not text:
                        continue
                    span_id = f"table_{page_index+1}_{len(spans)+1}"
                    spans.append(
                        Span(
                            span_id=span_id,
                            page=page_index + 1,
                            bbox=bbox,
                            text=text,
                            span_type="table_cell",
                            confidence=0.7,
                            extraction_method="pdfplumber_table",
                        )
                    )
    return spans


def write_spans(spans: List[Span], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        for span in spans:
            record = {
                "span_id": span.span_id,
                "page": span.page,
                "bbox": list(span.bbox),
                "text": span.text,
                "span_type": span.span_type,
                "confidence": span.confidence,
                "extraction_method": span.extraction_method,
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def _slug(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip().lower()).strip("_")
    return text[:40] if text else "condition"


def _parse_age_constraints(text: str) -> List[Dict[str, Any]]:
    constraints = []
    lower = text.lower()
    for match in re.finditer(r"(>=|<=|>|<)?\s*(\d+)\s*(months?|years?)", lower):
        op = match.group(1) or ">="
        val = int(match.group(2))
        unit = match.group(3)
        if unit.startswith("year"):
            val *= 12
        constraints.append({"var": "age_months", "op": op, "val": val})
    return constraints


def _conditions_from_text(text: str) -> List[Dict[str, Any]]:
    clauses = [c.strip(" -\n\t") for c in re.split(r"[\n;•]", text) if c.strip()]
    conditions = []
    for clause in clauses:
        slug = _slug(clause)
        conditions.append({"var": slug, "op": "==", "val": True})
    return conditions


def _build_rules_from_table_cells(spans: List[Span]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    rules = []
    manual_review = []

    by_page: Dict[int, List[Span]] = {}
    for span in spans:
        by_page.setdefault(span.page, []).append(span)

    for page, page_spans in by_page.items():
        cells = [s for s in page_spans if s.span_type == "table_cell"]
        if not cells:
            continue
        cells.sort(key=lambda s: (s.bbox[1], s.bbox[0]))
        rows: List[List[Span]] = []
        row_tol = 5.0
        for cell in cells:
            placed = False
            for row in rows:
                if abs(row[0].bbox[1] - cell.bbox[1]) <= row_tol:
                    row.append(cell)
                    placed = True
                    break
            if not placed:
                rows.append([cell])
        for row in rows:
            row.sort(key=lambda s: s.bbox[0])
            if len(row) < 2:
                continue
            condition_cell = row[0]
            class_cell = row[1]
            action_cell = row[2] if len(row) > 2 else None
            if not condition_cell.text or not class_cell.text:
                continue
            condition_expr = {"all": []}
            condition_expr["all"].extend(_parse_age_constraints(condition_cell.text))
            condition_expr["all"].extend(_conditions_from_text(condition_cell.text))
            rule_id = f"rule_{page}_{len(rules)+1}"
            references = [
                {"page": condition_cell.page, "text_span_id": condition_cell.span_id},
                {"page": class_cell.page, "text_span_id": class_cell.span_id},
            ]
            if action_cell:
                references.append({"page": action_cell.page, "text_span_id": action_cell.span_id})
            rules.append(
                {
                    "id": rule_id,
                    "age_band": "",  # derived from condition_expression
                    "inputs": [c["var"] for c in condition_expr["all"] if c["var"] != "age_months"],
                    "conditions": condition_expr,
                    "classification": class_cell.text,
                    "severity_color": _infer_severity_color(class_cell.text),
                    "actions": action_cell.text if action_cell else "",
                    "followup": "",
                    "contraindications": "",
                    "references": references,
                }
            )
    return rules, manual_review


def _build_rules_from_linear_spans(spans: List[Span]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    rules: List[Dict[str, Any]] = []
    manual_review: List[Dict[str, Any]] = []

    by_page: Dict[int, List[Span]] = {}
    for span in spans:
        by_page.setdefault(span.page, []).append(span)

    for page, page_spans in by_page.items():
        ordered = sorted(page_spans, key=lambda s: (s.bbox[1], s.bbox[0]))
        current_conditions: List[Span] = []
        last_classification: Span | None = None
        for span in ordered:
            if span.span_type == "heading":
                current_conditions = []
                last_classification = None
                continue
            if span.span_type == "condition":
                current_conditions.append(span)
                continue
            if span.span_type == "classification":
                last_classification = span
                continue
            if span.span_type == "treatment" and last_classification:
                conds = current_conditions[:] if current_conditions else []
                condition_expr = {"all": []}
                for c in conds:
                    condition_expr["all"].extend(_parse_age_constraints(c.text))
                    condition_expr["all"].extend(_conditions_from_text(c.text))
                if not condition_expr["all"]:
                    condition_expr["all"].append({"var": "true", "op": "==", "val": True})
                rule_id = f"rule_linear_{page}_{len(rules)+1}"
                references = [
                    {"page": last_classification.page, "text_span_id": last_classification.span_id},
                    {"page": span.page, "text_span_id": span.span_id},
                ]
                for c in conds:
                    references.append({"page": c.page, "text_span_id": c.span_id})
                rules.append(
                    {
                        "id": rule_id,
                        "age_band": "",
                        "inputs": [c["var"] for c in condition_expr["all"] if c["var"] != "age_months"],
                        "conditions": condition_expr,
                        "classification": last_classification.text,
                        "severity_color": _infer_severity_color(last_classification.text),
                        "actions": span.text,
                        "followup": "",
                        "contraindications": "",
                        "references": references,
                    }
                )
                current_conditions = []
                last_classification = None
                continue
        # Any remaining classification without treatment gets flagged
        # Do not emit manual review here; coverage report handles unmapped logic spans.

    return rules, manual_review


def _is_color_label_text(text: str) -> bool:
    t = text.strip().lower().rstrip(":")
    return t in {"pink", "yellow", "green", "red", "orange"}


def _combine_spans(spans: List[Span]) -> str:
    parts = [s.text.strip() for s in spans if s.text and s.text.strip()]
    return " ".join(parts)


def _build_rules_from_blocks(spans: List[Span]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    rules: List[Dict[str, Any]] = []
    manual_review: List[Dict[str, Any]] = []

    by_page: Dict[int, List[Span]] = {}
    for span in spans:
        by_page.setdefault(span.page, []).append(span)

    for page, page_spans in by_page.items():
        ordered = sorted(page_spans, key=lambda s: (s.bbox[1], s.bbox[0]))
        n = len(ordered)
        i = 0
        while i < n:
            span = ordered[i]
            if span.span_type not in {"classification", "note"} or not span.text:
                i += 1
                continue

            # Identify a classification group
            class_group = []
            color = None
            if span.span_type == "note" and _is_color_label_text(span.text):
                color = span.text.strip().rstrip(":").lower()
                class_group.append(span)
                i += 1
                # collect following classification spans
                while i < n and ordered[i].span_type in {"classification", "note"}:
                    if ordered[i].span_type == "note" and _is_color_label_text(ordered[i].text):
                        break
                    class_group.append(ordered[i])
                    i += 1
            elif span.span_type == "classification":
                class_group.append(span)
                i += 1
                while i < n and ordered[i].span_type == "classification":
                    class_group.append(ordered[i])
                    i += 1
            else:
                i += 1
                continue

            if not class_group:
                continue

            class_text = _combine_spans(class_group)
            severity_color = color or _infer_severity_color(class_text)

            # collect conditions above classification within a window
            cond_spans: List[Span] = []
            j = i - len(class_group) - 1
            y_limit = class_group[0].bbox[1] - 200
            while j >= 0:
                prev = ordered[j]
                if prev.bbox[1] < y_limit:
                    break
                if prev.span_type in {"heading", "flow_node"}:
                    break
                if prev.span_type in {"condition", "note"}:
                    if prev.span_type == "note" and _is_color_label_text(prev.text):
                        break
                    cond_spans.append(prev)
                j -= 1
            cond_spans = list(reversed(cond_spans))

            # collect treatments after classification within a window
            treat_spans: List[Span] = []
            k = i
            y_limit_down = class_group[-1].bbox[3] + 220
            while k < n:
                nxt = ordered[k]
                if nxt.bbox[1] > y_limit_down:
                    break
                if nxt.span_type in {"heading", "flow_node", "classification"}:
                    break
                if nxt.span_type in {"treatment", "note"}:
                    treat_spans.append(nxt)
                k += 1

            condition_expr = {"all": []}
            for c in cond_spans:
                condition_expr["all"].extend(_parse_age_constraints(c.text))
                condition_expr["all"].extend(_conditions_from_text(c.text))
            if not condition_expr["all"]:
                condition_expr["all"].append({"var": "true", "op": "==", "val": True})

            rule_id = f"rule_block_{page}_{len(rules)+1}"
            references = []
            for s in class_group + cond_spans + treat_spans:
                references.append({"page": s.page, "text_span_id": s.span_id})

            rules.append(
                {
                    "id": rule_id,
                    "age_band": "",
                    "inputs": [c["var"] for c in condition_expr["all"] if c["var"] != "age_months"],
                    "conditions": condition_expr,
                    "classification": class_text,
                    "severity_color": severity_color,
                    "actions": _combine_spans(treat_spans),
                    "followup": "",
                    "contraindications": "",
                    "references": references,
                }
            )

        # Do not emit manual review here; coverage report handles unmapped logic spans.

    return rules, manual_review


def _infer_severity_color(text: str) -> str:
    upper = text.upper()
    if "SEVERE" in upper or "VERY" in upper:
        return "red"
    if "SOME" in upper:
        return "yellow"
    if upper.startswith("NO ") or upper == "NO":
        return "green"
    return "unknown"


def _parse_weight_range(text: str) -> Optional[Tuple[float, float]]:
    m = re.search(r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)", text)
    if not m:
        return None
    return float(m.group(1)), float(m.group(2))


def _bbox_iou(a: Tuple[float, float, float, float], b: Tuple[float, float, float, float]) -> float:
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    ix0, iy0 = max(ax0, bx0), max(ay0, by0)
    ix1, iy1 = min(ax1, bx1), min(ay1, by1)
    iw, ih = max(0.0, ix1 - ix0), max(0.0, iy1 - iy0)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    a_area = max(0.0, ax1 - ax0) * max(0.0, ay1 - ay0)
    b_area = max(0.0, bx1 - bx0) * max(0.0, by1 - by0)
    if a_area <= 0 or b_area <= 0:
        return 0.0
    return inter / (a_area + b_area - inter)


def _match_span_id(
    spans_by_page: Dict[int, List[Span]],
    page: int,
    bbox: Tuple[float, float, float, float],
    text: str,
) -> Optional[str]:
    candidates = spans_by_page.get(page, [])
    best = None
    best_score = 0.0
    norm_text = " ".join(text.split()).strip()
    for s in candidates:
        if not s.text:
            continue
        score = _bbox_iou(bbox, s.bbox)
        if norm_text and norm_text == " ".join(s.text.split()).strip():
            score += 0.5
        if score > best_score:
            best_score = score
            best = s.span_id
    if best_score >= 0.2:
        return best
    return None


def _build_rules_from_tables(pdf_path: Path, spans: List[Span]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    if pdfplumber is None:
        raise RuntimeError("pdfplumber is not available")

    rules: List[Dict[str, Any]] = []
    manual_review: List[Dict[str, Any]] = []
    spans_by_page: Dict[int, List[Span]] = {}
    for s in spans:
        spans_by_page.setdefault(s.page, []).append(s)

    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_index, page in enumerate(pdf.pages):
            tables = page.find_tables(
                {
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "lines",
                    "intersection_tolerance": 5,
                    "snap_tolerance": 3,
                    "join_tolerance": 3,
                }
            )
            for table in tables:
                table_rows = table.rows
                table_text = table.extract()
                if not table_rows or not table_text:
                    continue
                # Identify data rows by weight range in first column
                data_start = None
                for i, row in enumerate(table_text):
                    if row and row[0] and _parse_weight_range(str(row[0])):
                        data_start = i
                        break
                if data_start is None:
                    continue
                header_rows = table_text[:data_start]
                data_rows = table_text[data_start:]

                # Build column headers
                col_count = max(len(r) for r in table_text)
                col_headers = [""] * col_count
                header_refs: List[Optional[Tuple[int, Tuple[float, float, float, float]]]] = [None] * col_count
                for r_idx, row in enumerate(header_rows):
                    for c_idx in range(col_count):
                        cell_text = row[c_idx] if c_idx < len(row) else None
                        if cell_text and str(cell_text).strip():
                            col_headers[c_idx] = (col_headers[c_idx] + " " + str(cell_text)).strip()
                            cell_bbox = None
                            if r_idx < len(table_rows) and c_idx < len(table_rows[r_idx].cells):
                                cell_bbox = table_rows[r_idx].cells[c_idx]
                            if cell_bbox:
                                header_refs[c_idx] = (page_index + 1, cell_bbox)

                # Create rules for each dose cell
                for r_offset, row in enumerate(data_rows):
                    table_row_idx = data_start + r_offset
                    if not row or not row[0]:
                        continue
                    w_range = _parse_weight_range(str(row[0]))
                    if not w_range:
                        continue
                    for c_idx in range(1, col_count):
                        cell_text = row[c_idx] if c_idx < len(row) else None
                        if not cell_text:
                            continue
                        cell_text = str(cell_text).strip()
                        if not cell_text or cell_text == "-":
                            continue
                        header = col_headers[c_idx].strip()
                        classification = header if header else "TREATMENT_DOSING"
                        action = f"{header} {cell_text}".strip() if header else cell_text

                        # references
                        references = []
                        # weight cell bbox
                        if table_row_idx < len(table_rows) and 0 < len(table_rows[table_row_idx].cells):
                            weight_bbox = table_rows[table_row_idx].cells[0]
                            if weight_bbox:
                                ref = {"page": page_index + 1, "bbox": list(weight_bbox)}
                                span_id = _match_span_id(spans_by_page, page_index + 1, weight_bbox, str(row[0]))
                                if span_id:
                                    ref["text_span_id"] = span_id
                                references.append(ref)
                        # dose cell bbox
                        if table_row_idx < len(table_rows) and c_idx < len(table_rows[table_row_idx].cells):
                            dose_bbox = table_rows[table_row_idx].cells[c_idx]
                            if dose_bbox:
                                ref = {"page": page_index + 1, "bbox": list(dose_bbox)}
                                span_id = _match_span_id(spans_by_page, page_index + 1, dose_bbox, cell_text)
                                if span_id:
                                    ref["text_span_id"] = span_id
                                references.append(ref)
                        # header bbox
                        header_ref = header_refs[c_idx]
                        if header_ref:
                            ref = {"page": header_ref[0], "bbox": list(header_ref[1])}
                            span_id = _match_span_id(spans_by_page, header_ref[0], header_ref[1], header)
                            if span_id:
                                ref["text_span_id"] = span_id
                            references.append(ref)

                        rule_id = f"rule_weight_{page_index+1}_{len(rules)+1}"
                        conditions = {
                            "all": [
                                {"var": "weight_kg", "op": ">=", "val": w_range[0]},
                                {"var": "weight_kg", "op": "<=", "val": w_range[1]},
                            ]
                        }
                        rules.append(
                            {
                                "id": rule_id,
                                "age_band": "",
                                "inputs": ["weight_kg"],
                                "conditions": conditions,
                                "classification": classification,
                                "severity_color": "unknown",
                                "actions": action,
                                "followup": "",
                                "contraindications": "",
                                "references": references,
                            }
                        )

                # Any unmapped logic will be handled by coverage attachment; avoid duplicate manual review.

    return rules, manual_review


def build_graph(rules: List[Dict[str, Any]]) -> Dict[str, Any]:
    nodes = []
    edges = []
    for rule in rules:
        cond_id = f"cond_{rule['id']}"
        class_id = f"class_{rule['id']}"
        action_id = f"action_{rule['id']}"
        nodes.append({"id": cond_id, "label": "Conditions", "type": "condition"})
        nodes.append({"id": class_id, "label": rule["classification"], "type": "classification"})
        nodes.append({"id": action_id, "label": rule["actions"], "type": "action"})
        edges.append({"from": cond_id, "to": class_id, "condition_expression": rule["conditions"]})
        edges.append({"from": class_id, "to": action_id, "condition_expression": {"all": [{"var": "true", "op": "==", "val": True}]}})
    return {"nodes": nodes, "edges": edges, "rules": rules}


def generate_synthetic_cases(rules: List[Dict[str, Any]], n_per_rule: int = 25) -> List[Dict[str, Any]]:
    cases = []
    case_index = 1
    for rule in rules:
        base_conditions = rule["conditions"].get("all", [])
        age_constraints = [c for c in base_conditions if c.get("var") == "age_months"]
        bool_conditions = [c for c in base_conditions if c.get("var") != "age_months"]
        age_val = 24
        if age_constraints:
            mins = [c["val"] for c in age_constraints if c["op"] in {">=", ">"}]
            maxs = [c["val"] for c in age_constraints if c["op"] in {"<=", "<"}]
            min_v = max(mins) if mins else 0
            max_v = min(maxs) if maxs else max(min_v + 1, min_v + 12)
            age_val = min_v
            if age_val >= max_v:
                age_val = max(0, max_v - 1)
        for _ in range(n_per_rule):
            record: Dict[str, Any] = {
                "case_id": f"case_{case_index}",
                "age_months": age_val,
                "derived_classification": rule["classification"],
                "derived_actions": rule["actions"],
                "rule_ids_triggered": [rule["id"]],
                "references": rule["references"],
            }
            for cond in bool_conditions:
                record[cond["var"]] = True
            cases.append(record)
            case_index += 1
    return cases


def _build_rules_for_unmapped_spans(spans: List[Span], referenced_ids: set) -> List[Dict[str, Any]]:
    rules: List[Dict[str, Any]] = []
    by_page: Dict[int, List[Span]] = {}
    for s in spans:
        by_page.setdefault(s.page, []).append(s)

    for page, page_spans in by_page.items():
        ordered = sorted(page_spans, key=lambda s: (s.bbox[1], s.bbox[0]))
        # Map classification spans
        for idx, s in enumerate(ordered):
            if s.span_type != "classification" or s.span_id in referenced_ids:
                continue
            # nearest treatment below
            treat = None
            for j in range(idx + 1, len(ordered)):
                if ordered[j].span_type in {"heading", "flow_node", "classification"}:
                    break
                if ordered[j].span_type == "treatment":
                    treat = ordered[j]
                    break
            # conditions above
            conds = []
            for j in range(idx - 1, -1, -1):
                prev = ordered[j]
                if prev.span_type in {"heading", "flow_node", "classification"}:
                    break
                if prev.span_type in {"condition", "note"}:
                    conds.append(prev)
                if s.bbox[1] - prev.bbox[1] > 220:
                    break
            conds = list(reversed(conds))
            condition_expr = {"all": []}
            for c in conds:
                condition_expr["all"].extend(_parse_age_constraints(c.text))
                condition_expr["all"].extend(_conditions_from_text(c.text))
            if not condition_expr["all"]:
                condition_expr["all"].append({"var": "true", "op": "==", "val": True})
            rule_id = f"rule_unmapped_class_{page}_{len(rules)+1}"
            references = [{"page": s.page, "text_span_id": s.span_id}]
            for c in conds:
                references.append({"page": c.page, "text_span_id": c.span_id})
            if treat:
                references.append({"page": treat.page, "text_span_id": treat.span_id})
            rules.append(
                {
                    "id": rule_id,
                    "age_band": "",
                    "inputs": [c["var"] for c in condition_expr["all"] if c["var"] != "age_months"],
                    "conditions": condition_expr,
                    "classification": s.text,
                    "severity_color": _infer_severity_color(s.text),
                    "actions": treat.text if treat else "",
                    "followup": "",
                    "contraindications": "",
                    "references": references,
                }
            )

        # Map remaining treatment spans
        for idx, s in enumerate(ordered):
            if s.span_type != "treatment" or s.span_id in referenced_ids:
                continue
            cls = None
            for j in range(idx - 1, -1, -1):
                if ordered[j].span_type == "classification":
                    cls = ordered[j]
                    break
                if ordered[j].span_type in {"heading", "flow_node"}:
                    break
            if not cls:
                continue
            rule_id = f"rule_unmapped_treat_{page}_{len(rules)+1}"
            condition_expr = {"all": [{"var": "true", "op": "==", "val": True}]}
            references = [{"page": s.page, "text_span_id": s.span_id}, {"page": cls.page, "text_span_id": cls.span_id}]
            rules.append(
                {
                    "id": rule_id,
                    "age_band": "",
                    "inputs": [],
                    "conditions": condition_expr,
                    "classification": cls.text,
                    "severity_color": _infer_severity_color(cls.text),
                    "actions": s.text,
                    "followup": "",
                    "contraindications": "",
                    "references": references,
                }
            )

        # Map remaining condition spans by linking to nearest classification below
        for idx, s in enumerate(ordered):
            if s.span_type != "condition" or s.span_id in referenced_ids:
                continue
            cls = None
            for j in range(idx + 1, len(ordered)):
                if ordered[j].span_type == "classification":
                    cls = ordered[j]
                    break
                if ordered[j].span_type in {"heading", "flow_node"}:
                    break
            if not cls:
                continue
            condition_expr = {"all": []}
            condition_expr["all"].extend(_parse_age_constraints(s.text))
            condition_expr["all"].extend(_conditions_from_text(s.text))
            if not condition_expr["all"]:
                condition_expr["all"].append({"var": "true", "op": "==", "val": True})
            rule_id = f"rule_unmapped_cond_{page}_{len(rules)+1}"
            references = [{"page": s.page, "text_span_id": s.span_id}, {"page": cls.page, "text_span_id": cls.span_id}]
            rules.append(
                {
                    "id": rule_id,
                    "age_band": "",
                    "inputs": [c["var"] for c in condition_expr["all"] if c["var"] != "age_months"],
                    "conditions": condition_expr,
                    "classification": cls.text,
                    "severity_color": _infer_severity_color(cls.text),
                    "actions": "",
                    "followup": "",
                    "contraindications": "",
                    "references": references,
                }
            )

    return rules


def _attach_unmapped_spans_to_rules(spans: List[Span], rules: List[Dict[str, Any]]) -> None:
    logic_types = {"condition", "classification", "treatment", "table_cell", "flow_node", "color_label"}
    span_map = {s.span_id: s for s in spans}

    referenced_ids = {ref["text_span_id"] for r in rules for ref in r.get("references", []) if "text_span_id" in ref}
    unmapped = [s for s in spans if s.span_type in logic_types and s.span_id not in referenced_ids]

    # Build rule index by page using first reference span
    rule_pages: Dict[int, List[Dict[str, Any]]] = {}
    for r in rules:
        page = None
        for ref in r.get("references", []):
            sid = ref.get("text_span_id")
            if sid and sid in span_map:
                page = span_map[sid].page
                break
            if "page" in ref:
                page = ref["page"]
                break
        if page is None:
            continue
        rule_pages.setdefault(page, []).append(r)

    def center(bbox):
        x0, y0, x1, y1 = bbox
        return ((x0 + x1) / 2.0, (y0 + y1) / 2.0)

    for span in unmapped:
        candidates = rule_pages.get(span.page, [])
        if not candidates:
            # Create a minimal rule to hold this span
            rule_id = f"rule_orphan_{span.page}_{len(rules)+1}"
            rules.append(
                {
                    "id": rule_id,
                    "age_band": "",
                    "inputs": [],
                    "conditions": {"all": [{"var": "true", "op": "==", "val": True}]},
                    "classification": span.text if span.span_type == "classification" else "UNMAPPED",
                    "severity_color": _infer_severity_color(span.text),
                    "actions": span.text if span.span_type == "treatment" else "",
                    "followup": "",
                    "contraindications": "",
                    "references": [{"page": span.page, "text_span_id": span.span_id}],
                }
            )
            continue

        span_center = center(span.bbox)
        best = None
        best_dist = 1e9
        for r in candidates:
            ref_bbox = None
            for ref in r.get("references", []):
                sid = ref.get("text_span_id")
                if sid and sid in span_map:
                    ref_bbox = span_map[sid].bbox
                    break
            if ref_bbox is None:
                continue
            cx, cy = center(ref_bbox)
            dist = (cx - span_center[0]) ** 2 + (cy - span_center[1]) ** 2
            if dist < best_dist:
                best_dist = dist
                best = r
        if best is not None:
            best.setdefault("references", []).append({"page": span.page, "text_span_id": span.span_id})


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_jsonl(path: Path, records: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def write_csv(path: Path, records: List[Dict[str, Any]]) -> None:
    if not records:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    keys = sorted({k for r in records for k in r.keys()})
    with path.open("w", encoding="utf-8") as f:
        f.write(",".join(keys) + "\n")
        for r in records:
            row = []
            for k in keys:
                val = r.get(k, "")
                if isinstance(val, list):
                    val = "|".join(str(v) for v in val)
                row.append(str(val).replace("\n", " ").replace(",", ";"))
            f.write(",".join(row) + "\n")


def _eval_condition(expr: Dict[str, Any], case: Dict[str, Any]) -> bool:
    if "all" in expr:
        return all(_eval_condition(c, case) for c in expr["all"])
    if "any" in expr:
        return any(_eval_condition(c, case) for c in expr["any"])
    if "not" in expr:
        return not _eval_condition(expr["not"], case)
    var = expr.get("var")
    op = expr.get("op")
    val = expr.get("val")
    if op == "exists":
        return var in case
    left = case.get(var)
    if op == "==":
        return left == val
    if op == "!=":
        return left != val
    if op == "<":
        return left is not None and left < val
    if op == "<=":
        return left is not None and left <= val
    if op == ">":
        return left is not None and left > val
    if op == ">=":
        return left is not None and left >= val
    if op == "in":
        return left in val if left is not None else False
    if op == "contains":
        return val in left if isinstance(left, str) else False
    return False


def verify_round_trip(cases: List[Dict[str, Any]], rules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    issues = []
    rule_map = {r["id"]: r for r in rules}
    for case in cases:
        for rid in case.get("rule_ids_triggered", []):
            rule = rule_map.get(rid)
            if not rule:
                issues.append({"case_id": case["case_id"], "rule_id": rid, "reason": "Missing rule"})
                continue
            if not _eval_condition(rule["conditions"], case):
                issues.append({"case_id": case["case_id"], "rule_id": rid, "reason": "Case does not satisfy rule conditions"})
    return issues


def build_reports(
    spans: List[Span],
    rules: List[Dict[str, Any]],
    manual_review: List[Dict[str, Any]],
    cases: List[Dict[str, Any]],
    out_dir: Path,
) -> None:
    rule_refs = set()
    for rule in rules:
        for ref in rule.get("references", []):
            if "text_span_id" in ref:
                rule_refs.add(ref["text_span_id"])

    logic_span_types = {"condition", "classification", "treatment", "table_cell", "flow_node", "color_label"}
    unmapped = [s for s in spans if s.span_type in logic_span_types and s.span_id not in rule_refs]
    for span in unmapped:
        manual_review.append(
            {
                "page": span.page,
                "bbox": span.bbox,
                "text": span.text,
                "text_span_id": span.span_id,
                "reason": "Logic span not mapped to any rule",
            }
        )

    pages_processed = len({s.page for s in spans})
    spans_count = len(spans)
    rules_count = len(rules)
    unresolved_count = len(manual_review)

    rule_hit_counts = {r["id"]: 0 for r in rules}
    for case in cases:
        for rid in case.get("rule_ids_triggered", []):
            if rid in rule_hit_counts:
                rule_hit_counts[rid] += 1

    round_trip_issues = verify_round_trip(cases, rules)

    coverage_lines = [
        "# IMCI Coverage Report",
        "",
        f"- Pages processed: {pages_processed}",
        f"- Spans extracted: {spans_count}",
        f"- Rules extracted: {rules_count}",
        f"- Unresolved items: {unresolved_count}",
        f"- Round-trip issues: {len(round_trip_issues)}",
        "",
        "## Rule Coverage",
    ]
    coverage_lines.extend([f"- {rid}: {count}" for rid, count in rule_hit_counts.items()])

    coverage_lines.append("")
    coverage_lines.append("## Source Coverage")
    by_page = {}
    for span in spans:
        by_page.setdefault(span.page, []).append(span)
    for page, page_spans in sorted(by_page.items()):
        page_logic = [s for s in page_spans if s.span_type in logic_span_types]
        mapped = [s for s in page_logic if s.span_id in rule_refs]
        pct = 0.0 if not page_logic else 100.0 * len(mapped) / len(page_logic)
        coverage_lines.append(f"- Page {page}: {pct:.1f}% mapped")

    report_path = out_dir / "reports" / "coverage_report.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(coverage_lines), encoding="utf-8")

    if round_trip_issues:
        round_trip_path = out_dir / "reports" / "round_trip_issues.json"
        write_json(round_trip_path, round_trip_issues)


def run_pipeline(pdf_url: str, out_dir: Path) -> Dict[str, Any]:
    raw_pdf = out_dir / "raw" / "imci_chart_booklet.pdf"
    download_pdf(pdf_url, raw_pdf)

    spans = extract_spans(raw_pdf)
    table_spans = extract_table_cells(raw_pdf)
    spans.extend(table_spans)

    spans_out = out_dir / "imci_source_spans.jsonl"
    write_spans(spans, spans_out)

    table_rules_structured, manual_review = _build_rules_from_tables(raw_pdf, spans)
    table_rules_fallback, _ = _build_rules_from_table_cells(spans)
    linear_rules, _ = _build_rules_from_linear_spans(spans)
    block_rules, _ = _build_rules_from_blocks(spans)
    rules = table_rules_structured + table_rules_fallback + linear_rules + block_rules
    # De-duplicate rules by (classification, actions, conditions)
    dedup = []
    seen = set()
    for r in rules:
        key = (r.get("classification"), r.get("actions"), json.dumps(r.get("conditions"), sort_keys=True))
        if key in seen:
            continue
        seen.add(key)
        dedup.append(r)
    rules = dedup

    referenced_ids = {ref["text_span_id"] for r in rules for ref in r.get("references", []) if "text_span_id" in ref}
    extra_rules = _build_rules_for_unmapped_spans(spans, referenced_ids)
    rules.extend(extra_rules)

    _attach_unmapped_spans_to_rules(spans, rules)
    graph = build_graph(rules)

    rules_out = out_dir / "imci_rules.json"
    write_json(rules_out, graph)

    cases = generate_synthetic_cases(rules, n_per_rule=25)
    cases_out = out_dir / "imci_cases_synthetic.jsonl"
    write_jsonl(cases_out, cases)

    dataset_out = out_dir / "imci_dataset.csv"
    write_csv(dataset_out, cases)

    build_reports(spans, rules, manual_review, cases, out_dir)

    needs_review_out = out_dir / "reports" / "needs_manual_review.json"
    write_json(needs_review_out, manual_review)

    return {
        "spans_path": spans_out,
        "rules_path": rules_out,
        "cases_path": cases_out,
        "dataset_path": dataset_out,
        "coverage_report": out_dir / "reports" / "coverage_report.md",
        "needs_review": needs_review_out,
        "spans_count": len(spans),
        "rules_count": len(rules),
        "unresolved_count": len(manual_review),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf-url", required=True)
    parser.add_argument("--out-dir", required=True)
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    results = run_pipeline(args.pdf_url, out_dir)

    print("Paths produced:")
    for key in ["spans_path", "rules_path", "cases_path", "dataset_path", "coverage_report", "needs_review"]:
        print(f"- {results[key]}")
    print("Stats:")
    print(f"- spans: {results['spans_count']}")
    print(f"- rules: {results['rules_count']}")
    print(f"- unresolved: {results['unresolved_count']}")


if __name__ == "__main__":
    main()
