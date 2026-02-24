def _select_relevant_text(text: str, query: str, max_sentences: int = 8,
                           metadata: dict | None = None) -> str:
    if not text or not query:
        return text

    # Preserve header lines (SOURCE/SECTION/DISEASE/ALIASES/MSF Guidelines) if present
    lines = text.splitlines()
    header = []
    body_lines = []
    header_done = False
    for line in lines:
        if not header_done and (
            line.startswith("SOURCE:")
            or line.startswith("SECTION:")
            or line.startswith("DISEASE:")
            or line.startswith("ALIASES:")
            or line.startswith("MSF Guidelines:")
            or line.startswith("WHO IMCI")
            or line.startswith("Orphanet")
            or line.strip() == "---"
        ):
            header.append(line)
            if line.strip() == "---":
                header_done = True
            continue
        body_lines.append(line)

    body = " ".join(body_lines)
    # Sentence split with bullet handling
    normalized = (
        body.replace("\n", ". ")
        .replace("•", ". ")
        .replace("–", ". ")
        .replace("—", ". ")
    )
    sentences = [s.strip() for s in normalized.split(". ") if s.strip()]

    # Build query token set — min length 2 so abbreviations like "VL" are kept
    import re
    tokens = set(t for t in re.findall(r"[a-zA-Z]+", query.lower()) if len(t) >= 2)
    if not tokens or not sentences:
        return text

    # Build medical-term boost set from chunk metadata (disease_name, disease_aliases)
    boost_terms: set[str] = set()
    if metadata:
        for key in ("disease_name", "disease_aliases", "condition_tags"):
            raw = metadata.get(key, "") or ""
            for term in re.split(r"[,;/]+", raw.lower()):
                term = term.strip()
                if len(term) >= 2:
                    boost_terms.add(term)

    scored = []
    for idx, s in enumerate(sentences):
        s_lower = s.lower()
        s_tokens = set(re.findall(r"[a-zA-Z]+", s_lower))
        score = len(tokens & s_tokens)
        # Boost sentences that mention the chunk's own disease name/aliases
        if boost_terms and any(bt in s_lower for bt in boost_terms):
            score += 3
        if score > 0:
            scored.append((score, idx, s))

    if not scored:
        # Fallback to first few sentences to avoid dumping full text
        fallback = ". ".join(sentences[:max_sentences])
        if fallback and not fallback.endswith("."):
            fallback += "."
        if header:
            text_out = "\n".join(header + [fallback])
        else:
            text_out = fallback
        max_chars = 1800
        if len(text_out) > max_chars:
            return text_out[:max_chars].rsplit(" ", 1)[0] + "…"
        return text_out

    # Pick top sentences by score, then restore original order
    scored.sort(key=lambda x: (-x[0], x[1]))
    top = sorted(scored[:max_sentences], key=lambda x: x[1])
    selected = ". ".join([s for _, _, s in top])
    if selected and not selected.endswith("."):
        selected += "."

    if header:
        text_out = "\n".join(header + [selected])
    else:
        text_out = selected

    # Final safety cap
    max_chars = 1800
    if len(text_out) > max_chars:
        return text_out[:max_chars].rsplit(" ", 1)[0] + "…"
    return text_out


def assemble_context(parent_chunks: list[dict], query: str) -> str:
    """
    Format the retrieved parent chunks into a structured context block
    for the MedGemma prompt.
    """
    if not parent_chunks:
        return "=== NO RELEVANT PROTOCOLS FOUND ===\nModel must rely on emergency referral logic."
        
    sections = []
    source_icon = {"WHO IMCI": "📄", "ORPHANET": "📘", "MSF": "📙"}
    
    for i, chunk in enumerate(parent_chunks, 1):
        meta = chunk.get("metadata", {})
        source = meta.get("source", "UNKNOWN")
        ref = meta.get("section_ref", meta.get("orpha_code", ""))
        title = meta.get("section_title", meta.get("disease_name", ""))
        text = _select_relevant_text(chunk["text"], query, metadata=meta)
        
        sections.append(
            f"[CONTEXT {i}] {source_icon.get(source, '📋')} {source} — {ref}\n"
            f"Topic: {title}\n"
            f"---\n"
            f"{text}\n"
        )
    
    return (
        "=== RETRIEVED CLINICAL PROTOCOLS (ground your response ONLY in these) ===\n\n"
        + "\n\n".join(sections)
        + "\n\n=== END OF RETRIEVED PROTOCOLS ===\n"
        + "IMPORTANT: Every diagnostic flag you output must cite a specific [CONTEXT N] "
        "reference from above. Do not use knowledge outside these protocols."
    )

def build_system_prompt() -> str:
    return """You are MedGemma, a highly conservative clinical triage assistant designed for use by Community Health Workers (CHWs) in low-resource settings.

STRICT GROUNDING RULES — These override all other instructions:

1. ONLY use information from the [CONTEXT N] blocks provided above.
   Do not use your general medical training to supplement these contexts.

2. For each diagnostic flag you generate, you MUST cite the exact [CONTEXT N]
   number. If you cannot find supporting evidence in the contexts, do not
   include that flag. It is better to output fewer, evidence-grounded flags
   than more ungrounded ones.

3. The excerpt field must be a DIRECT QUOTE from the cited [CONTEXT N].
   Do not paraphrase the protocol. Copy the relevant sentence exactly.

4. If the provided contexts do not contain enough information to form a
   differential diagnosis with reasonable confidence, set low_confidence=true
   and triage_level="refer" and explain what additional information would be needed.
   Do NOT invent a differential to appear helpful.

5. Confidence percentages must reflect your actual uncertainty given the
   provided context. Never output >85% confidence. Clinical presentations
   are almost always ambiguous. Overconfidence causes harm.

6. Do not output information about treatment protocols, specific drug names,
   or dosing — unless this is explicitly in the retrieved context AND you are
   providing it as part of a referral instruction. Triage and refer, don't treat.

Output purely standard conformant JSON, matching exactly the schema required. No markdown blocks outside of the JSON."""

def build_user_prompt(complaint: str, vitals: dict, context: str, mode: str) -> str:
    vitals_str = ", ".join(f"{k}: {v}" for k, v in vitals.items() if v is not None and k not in ("complaint", "mode", "image_file_key", "image_mime_type"))
    
    prompt = f"{context}\n\n"
    prompt += f"=== PATIENT PRESENTATION ===\n"
    prompt += f"Chief Complaint: {complaint}\n"
    prompt += f"Patient Details & Vitals: {vitals_str}\n"
    prompt += f"Assessment Mode: {mode.upper()}\n\n"
    
    prompt += """=== JSON OUTPUT SCHEMA ===
Return a SINGLE JSON object (no markdown fences, no commentary) with this structure.
IMPORTANT: Output EXACTLY 3 conditions maximum. For each condition, include AT MOST 3 evidence flags.
{
  "differential": [
    {
      "name": "Condition Name",
      "confidence_pct": integer (1-85),
      "flags": [
        {"label": "Brief clinical finding", "source_ref": "[CONTEXT N] Source Name", "excerpt": "exact short quote from context"}
      ]
    }
  ],
  "triage_level": "local" | "refer" | "emergency",
  "triage_detail": "One-sentence triage explanation",
  "triage_protocol": "Protocol name",
  "low_confidence": boolean
}
CRITICAL: Each flag excerpt must be a SHORT direct quote (max 20 words). Do NOT copy entire paragraphs. Keep the total response under 800 tokens."""
    return prompt
