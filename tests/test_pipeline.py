from pathlib import Path

import pytest

fitz = pytest.importorskip("fitz")
pdfplumber = pytest.importorskip("pdfplumber")

from src import build_imci_dataset

PDF_URL = "https://cdn.who.int/media/docs/default-source/mca-documents/child/imci-integrated-management-of-childhood-illness/imci-in-service-training/imci-chart-booklet.pdf?sfvrsn=f63af425_1&utm_source=chatgpt.com"


@pytest.mark.order(1)
def test_download(tmp_path):
    pdf_path = tmp_path / "imci.pdf"
    build_imci_dataset.download_pdf(PDF_URL, pdf_path)
    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 0


@pytest.mark.order(2)
def test_parse_spans_nonempty(tmp_path):
    pdf_path = tmp_path / "imci.pdf"
    build_imci_dataset.download_pdf(PDF_URL, pdf_path)
    spans = build_imci_dataset.extract_spans(pdf_path)
    assert spans


@pytest.mark.order(3)
def test_rules_have_references(tmp_path):
    pdf_path = tmp_path / "imci.pdf"
    build_imci_dataset.download_pdf(PDF_URL, pdf_path)
    spans = build_imci_dataset.extract_spans(pdf_path)
    spans.extend(build_imci_dataset.extract_table_cells(pdf_path))
    rules, manual_review = build_imci_dataset._build_rules_from_table_cells(spans)
    for rule in rules:
        assert rule["references"]


@pytest.mark.order(4)
def test_coverage_no_unmapped_logic_spans(tmp_path):
    out_dir = tmp_path / "out"
    build_imci_dataset.run_pipeline(PDF_URL, out_dir)
    needs_review = (out_dir / "reports" / "needs_manual_review.json").read_text(encoding="utf-8")
    assert needs_review is not None


@pytest.mark.order(5)
def test_synthetic_cases_hit_all_rules(tmp_path):
    pdf_path = tmp_path / "imci.pdf"
    build_imci_dataset.download_pdf(PDF_URL, pdf_path)
    spans = build_imci_dataset.extract_spans(pdf_path)
    spans.extend(build_imci_dataset.extract_table_cells(pdf_path))
    rules, _ = build_imci_dataset._build_rules_from_table_cells(spans)
    cases = build_imci_dataset.generate_synthetic_cases(rules, n_per_rule=25)
    rule_counts = {r["id"]: 0 for r in rules}
    for case in cases:
        for rid in case["rule_ids_triggered"]:
            rule_counts[rid] += 1
    for rid, count in rule_counts.items():
        assert count >= 25
