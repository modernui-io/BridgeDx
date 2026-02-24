"""
scripts/parse_msf_pdfs.py
--------------------------
Parses:
  1. MSF Clinical Guidelines 2021 PDF  → data/raw/msf_clinical_guidelines_2021.pdf
  2. MSF NCD Guidelines 2025 PDF       → data/raw/msf_ncd_guidelines_2025.pdf
  3. MSF portal pages (text files)     → data/raw/msf_portal_*.txt

Output:
  data/parsed/parsed_msf.json
  [
    {
      "id": "msf_cg_malaria",
      "text": "...",
      "source": "MSF",
      "source_document": "MSF Clinical Guidelines 2021",
      "section_ref": "MSF Clinical Guidelines — Chapter 6 — Malaria",
      "disease_name": "Malaria",
      "disease_aliases": ["malaria", "falciparum malaria", "plasmodium"],
      "condition_tags": ["fever", "chills", "rigors", "splenomegaly"],
      "chunk_type": "overview",
      "severity_level": "emergency",
      "patient_population": "all",
      "page_ref": "p. 126",
      "is_current": false
    },
    ...
  ]
"""

import os
import re
import json
import glob
import sys

# ---------------------------------------------------------------------------
# Disease section definitions for MSF Clinical Guidelines 2021
# Each entry defines: heading text to detect, normalized name, aliases, tags
# ---------------------------------------------------------------------------
CLINICAL_DISEASES = [
    {
        "markers": ["Shock"],
        "disease_name": "Shock",
        "aliases": ["shock", "circulatory shock", "septic shock", "hypovolaemic shock"],
        "tags": ["shock", "collapse", "hypotension", "emergency"],
        "chunk_type": "overview",
        "severity": "emergency",
    },
    {
        "markers": ["Fever"],
        "disease_name": "Fever",
        "aliases": ["fever", "pyrexia", "febrile illness"],
        "tags": ["fever", "temperature", "triage", "danger signs"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Malaria"],
        "disease_name": "Malaria",
        "aliases": ["malaria", "falciparum malaria", "plasmodium", "RDT", "artemisinin"],
        "tags": ["fever", "chills", "rigors", "splenomegaly", "RDT", "artemisinin"],
        "chunk_type": "overview",
        "severity": "emergency",
    },
    {
        "markers": ["Leishmaniases", "Leishmania"],
        "disease_name": "Visceral Leishmaniasis",
        "aliases": ["kala-azar", "kala azar", "VL", "visceral leishmaniasis", "leishmaniasis", "black fever"],
        "tags": ["fever", "hepatosplenomegaly", "weight loss", "endemic region", "rK39"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Typhoid"],
        "disease_name": "Typhoid Fever",
        "aliases": ["typhoid", "enteric fever", "salmonella typhi"],
        "tags": ["fever", "abdominal pain", "rose spots", "bradycardia"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Bacterial meningitis", "Meningitis"],
        "disease_name": "Bacterial Meningitis",
        "aliases": ["meningitis", "bacterial meningitis", "meningococcal meningitis"],
        "tags": ["headache", "neck stiffness", "photophobia", "fever", "kernig"],
        "chunk_type": "emergency_protocol",
        "severity": "emergency",
    },
    {
        "markers": ["Severe acute malnutrition", "SAM"],
        "disease_name": "Severe Acute Malnutrition",
        "aliases": ["severe acute malnutrition", "SAM", "marasmus", "kwashiorkor", "MUAC"],
        "tags": ["malnutrition", "oedema", "MUAC", "weight", "wasting"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Trypanosomiasis"],
        "disease_name": "African Trypanosomiasis",
        "aliases": ["trypanosomiasis", "sleeping sickness", "HAT", "trypanosome"],
        "tags": ["fever", "lymphadenopathy", "neurological", "tsetse fly"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Schistosomiasis"],
        "disease_name": "Schistosomiasis",
        "aliases": ["schistosomiasis", "bilharzia", "schistosome"],
        "tags": ["haematuria", "hepatosplenomegaly", "eosinophilia"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Tuberculosis", "Pulmonary tuberculosis"],
        "disease_name": "Tuberculosis",
        "aliases": ["tuberculosis", "TB", "pulmonary TB", "mycobacterium"],
        "tags": ["cough", "haemoptysis", "night sweats", "weight loss", "AFB"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Pneumonia"],
        "disease_name": "Pneumonia",
        "aliases": ["pneumonia", "community acquired pneumonia", "CAP"],
        "tags": ["cough", "dyspnoea", "fever", "crackles", "SpO2"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Dengue"],
        "disease_name": "Dengue Fever",
        "aliases": ["dengue", "dengue fever", "DHF", "dengue haemorrhagic fever"],
        "tags": ["fever", "rash", "haemorrhage", "thrombocytopenia", "platelet"],
        "chunk_type": "overview",
        "severity": "emergency",
    },
    {
        "markers": ["Viral haemorrhagic fever", "Haemorrhagic fever", "VHF"],
        "disease_name": "Viral Haemorrhagic Fever",
        "aliases": ["VHF", "viral haemorrhagic fever", "Ebola", "Marburg", "Lassa"],
        "tags": ["haemorrhage", "fever", "isolation", "PPE"],
        "chunk_type": "emergency_protocol",
        "severity": "emergency",
    },
    {
        "markers": ["Sickle cell disease"],
        "disease_name": "Sickle Cell Disease",
        "aliases": ["sickle cell disease", "SCD", "sickle cell anaemia", "vaso-occlusive"],
        "tags": ["anaemia", "pain crisis", "splenomegaly", "haemolysis"],
        "chunk_type": "overview",
        "severity": "emergency",
    },
    {
        "markers": ["Measles"],
        "disease_name": "Measles",
        "aliases": ["measles", "rubeola", "morbilli"],
        "tags": ["rash", "fever", "koplik spots", "cough", "conjunctivitis"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Brucellosis"],
        "disease_name": "Brucellosis",
        "aliases": ["brucellosis", "brucella", "undulant fever"],
        "tags": ["fever", "arthralgia", "sweating", "zoonosis"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Seizures", "Seizure"],
        "disease_name": "Seizures",
        "aliases": ["seizures", "convulsions", "epilepsy", "status epilepticus"],
        "tags": ["seizure", "convulsion", "loss of consciousness", "diazepam"],
        "chunk_type": "emergency_protocol",
        "severity": "emergency",
    },
    {
        "markers": ["Anaemia"],
        "disease_name": "Anaemia",
        "aliases": ["anaemia", "anemia", "haemoglobin", "pallor"],
        "tags": ["pallor", "fatigue", "haemoglobin", "blood transfusion"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Dehydration"],
        "disease_name": "Dehydration",
        "aliases": ["dehydration", "diarrhoea", "ORS", "rehydration"],
        "tags": ["diarrhoea", "vomiting", "ORS", "turgor", "fontanelle"],
        "chunk_type": "overview",
        "severity": "emergency",
    },
]

# ---------------------------------------------------------------------------
# NCD Guidelines disease sections
# ---------------------------------------------------------------------------
NCD_DISEASES = [
    {
        "markers": ["Asthma"],
        "disease_name": "Asthma",
        "aliases": ["asthma", "bronchial asthma", "wheeze", "bronchospasm"],
        "tags": ["wheeze", "dyspnoea", "bronchospasm", "salbutamol", "SpO2"],
        "chunk_type": "overview",
        "severity": "emergency",
    },
    {
        "markers": ["COPD", "Chronic obstructive pulmonary disease"],
        "disease_name": "COPD",
        "aliases": ["COPD", "chronic obstructive pulmonary disease", "emphysema", "chronic bronchitis"],
        "tags": ["dyspnoea", "cough", "smoking", "exacerbation"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Diabetes", "Diabetic"],
        "disease_name": "Diabetes",
        "aliases": ["diabetes", "diabetes mellitus", "DM", "hyperglycaemia", "DKA"],
        "tags": ["polydipsia", "polyuria", "glucose", "DKA", "insulin"],
        "chunk_type": "overview",
        "severity": "emergency",
    },
    {
        "markers": ["Hypertension"],
        "disease_name": "Hypertension",
        "aliases": ["hypertension", "high blood pressure", "hypertensive", "BP"],
        "tags": ["blood pressure", "headache", "hypertensive emergency", "stroke"],
        "chunk_type": "overview",
        "severity": "emergency",
    },
    {
        "markers": ["Heart failure", "Cardiac failure"],
        "disease_name": "Heart Failure",
        "aliases": ["heart failure", "cardiac failure", "congestive heart failure", "CHF"],
        "tags": ["oedema", "dyspnoea", "crackles", "JVP", "furosemide"],
        "chunk_type": "overview",
        "severity": "emergency",
    },
    {
        "markers": ["Epilepsy", "Status epilepticus"],
        "disease_name": "Epilepsy",
        "aliases": ["epilepsy", "seizure disorder", "status epilepticus", "anticonvulsant"],
        "tags": ["seizure", "convulsion", "phenobarbitone", "valproate"],
        "chunk_type": "emergency_protocol",
        "severity": "emergency",
    },
    {
        "markers": ["Stroke"],
        "disease_name": "Stroke",
        "aliases": ["stroke", "cerebrovascular accident", "CVA", "TIA", "hemiplegia"],
        "tags": ["facial droop", "arm weakness", "speech", "FAST", "acute"],
        "chunk_type": "emergency_protocol",
        "severity": "emergency",
    },
    {
        "markers": ["Thyroid"],
        "disease_name": "Thyroid Disorders",
        "aliases": ["thyroid", "hypothyroidism", "hyperthyroidism", "goitre", "thyrotoxicosis"],
        "tags": ["goitre", "TSH", "weight loss", "heat intolerance", "levothyroxine"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Chronic kidney disease", "CKD", "Renal"],
        "disease_name": "Chronic Kidney Disease",
        "aliases": ["CKD", "chronic kidney disease", "renal failure", "uraemia", "creatinine"],
        "tags": ["proteinuria", "creatinine", "oedema", "hypertension", "GFR"],
        "chunk_type": "overview",
        "severity": "refer",
    },
    {
        "markers": ["Ischaemic heart disease", "Coronary", "ACS", "Acute coronary"],
        "disease_name": "Ischaemic Heart Disease",
        "aliases": ["ischaemic heart disease", "IHD", "coronary artery disease", "ACS", "angina", "MI", "myocardial infarction"],
        "tags": ["chest pain", "ECG", "troponin", "aspirin", "nitrate"],
        "chunk_type": "emergency_protocol",
        "severity": "emergency",
    },
]


def extract_pdf_text(pdf_path: str) -> list[tuple[int, str]]:
    """
    Extract text from PDF using pdfplumber.
    Returns list of (page_number, page_text).
    """
    try:
        import pdfplumber
    except ImportError:
        print("pdfplumber not installed. Run: pip install pdfplumber")
        sys.exit(1)

    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            pages.append((i + 1, text))
    return pages


def pages_to_full_text(pages: list[tuple[int, str]]) -> tuple[str, dict[int, int]]:
    """
    Merge pages into single text string and build char_offset→page map.
    """
    full_text = ""
    char_to_page: dict[int, int] = {}
    for page_num, text in pages:
        char_to_page[len(full_text)] = page_num
        full_text += text + "\n"
    return full_text, char_to_page


def get_page_for_offset(offset: int, char_to_page: dict[int, int]) -> int:
    """Return the page number for a character offset."""
    last_page = 1
    for char_offset, page_num in sorted(char_to_page.items()):
        if char_offset <= offset:
            last_page = page_num
        else:
            break
    return last_page


def find_section(text: str, markers: list[str]) -> tuple[int, int] | None:
    """
    Find the first occurrence of any marker as a section heading.
    Returns (start, end) char positions or None.
    """
    # Look for marker as a whole-line or near-start-of-line heading
    for marker in markers:
        pattern = rf'(?m)^[\s]*{re.escape(marker)}[\s\n]'
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.start(), m.end()
    return None


def extract_disease_chunks(
    full_text: str,
    char_to_page: dict[int, int],
    disease_defs: list[dict],
    source_doc: str,
    chapter_prefix: str,
) -> list[dict]:
    """
    For each disease definition, find its section in full_text and create a chunk.
    """
    chunks = []
    # Build a list of (start, name, def) for all found sections, sorted by position
    found: list[tuple[int, int, dict]] = []

    for ddef in disease_defs:
        loc = find_section(full_text, ddef["markers"])
        if loc:
            found.append((loc[0], loc[1], ddef))
    
    found.sort(key=lambda x: x[0])

    for i, (start, heading_end, ddef) in enumerate(found):
        # Section ends at the start of the next section (or end of text)
        if i + 1 < len(found):
            end = found[i + 1][0]
        else:
            end = len(full_text)

        section_text = full_text[start:end].strip()

        # Truncate to a reasonable size (~3000 tokens ≈ 12000 chars)
        if len(section_text) > 12000:
            section_text = section_text[:12000] + "\n[Section truncated for indexing]"

        page_num = get_page_for_offset(start, char_to_page)
        disease_name = ddef["disease_name"]
        section_ref = f"{chapter_prefix} — {disease_name}"

        chunk_id = f"msf_{source_doc.lower().replace(' ', '_')}_{disease_name.lower().replace(' ', '_')}"

        # Add a header to the text for embedding context
        headed_text = (
            f"SOURCE: {source_doc}\n"
            f"SECTION: {section_ref}\n"
            f"DISEASE: {disease_name}\n"
            f"ALIASES: {', '.join(ddef['aliases'])}\n"
            "---\n"
            f"{section_text}"
        )

        chunks.append({
            "id": chunk_id,
            "text": headed_text,
            "source": "MSF",
            "source_document": source_doc,
            "section_ref": section_ref,
            "disease_name": disease_name,
            "disease_aliases": ddef["aliases"],
            "condition_tags": ddef["tags"],
            "chunk_type": ddef["chunk_type"],
            "severity_level": ddef["severity"],
            "patient_population": "all",
            "page_ref": f"p. {page_num}",
            "is_current": False,
        })

    return chunks


def parse_clinical_guidelines(pdf_path: str) -> list[dict]:
    """Parse MSF Clinical Guidelines 2021 PDF."""
    print("Parsing MSF Clinical Guidelines 2021...")
    if not os.path.exists(pdf_path):
        print(f"  Not found: {pdf_path} — skipping.")
        return []
    
    pages = extract_pdf_text(pdf_path)
    full_text, char_to_page = pages_to_full_text(pages)
    print(f"  Extracted {len(pages)} pages ({len(full_text):,} chars)")

    chunks = extract_disease_chunks(
        full_text=full_text,
        char_to_page=char_to_page,
        disease_defs=CLINICAL_DISEASES,
        source_doc="MSF Clinical Guidelines 2021",
        chapter_prefix="MSF Clinical Guidelines",
    )

    # Also add a general overview chunk
    overview_text = full_text[:3000]
    chunks.insert(0, {
        "id": "msf_cg_overview",
        "text": f"SOURCE: MSF Clinical Guidelines 2021\nSECTION: Overview\n---\n{overview_text}",
        "source": "MSF",
        "source_document": "MSF Clinical Guidelines 2021",
        "section_ref": "MSF Clinical Guidelines — Overview",
        "disease_name": "General Overview",
        "disease_aliases": [],
        "condition_tags": ["triage", "diagnosis", "treatment", "field medicine"],
        "chunk_type": "overview",
        "severity_level": "local",
        "patient_population": "all",
        "page_ref": "p. 1",
        "is_current": False,
    })

    print(f"  → {len(chunks)} chunks from Clinical Guidelines")
    return chunks


def parse_ncd_guidelines(pdf_path: str) -> list[dict]:
    """Parse MSF NCD Guidelines 2025 PDF."""
    print("Parsing MSF NCD Clinical Guidelines 2025...")
    if not os.path.exists(pdf_path):
        print(f"  Not found: {pdf_path} — skipping.")
        return []

    pages = extract_pdf_text(pdf_path)
    full_text, char_to_page = pages_to_full_text(pages)
    print(f"  Extracted {len(pages)} pages ({len(full_text):,} chars)")

    chunks = extract_disease_chunks(
        full_text=full_text,
        char_to_page=char_to_page,
        disease_defs=NCD_DISEASES,
        source_doc="MSF NCD Guidelines 2025",
        chapter_prefix="MSF NCD Guidelines",
    )

    print(f"  → {len(chunks)} chunks from NCD Guidelines")
    return chunks


def parse_portal_pages(raw_dir: str) -> list[dict]:
    """Parse scraped MSF portal text files."""
    print("Parsing MSF portal pages...")
    chunks = []
    files = glob.glob(os.path.join(raw_dir, "msf_portal_*.txt"))
    if not files:
        print("  No portal files found — skipping.")
        return []

    for fpath in files:
        fname = os.path.basename(fpath)
        topic = fname.replace("msf_portal_", "").replace(".txt", "")
        with open(fpath, encoding="utf-8") as f:
            text = f.read()

        # Parse the header metadata we wrote when scraping
        url = ""
        for line in text.splitlines()[:5]:
            if line.startswith("URL:"):
                url = line.replace("URL:", "").strip()

        # Find the matching disease def from our lists, or use generic metadata
        matched = None
        for ddef in CLINICAL_DISEASES + NCD_DISEASES:
            if any(m.lower() in topic.lower() for m in ddef["markers"]):
                matched = ddef
                break

        if matched:
            disease_name = matched["disease_name"]
            aliases = matched["aliases"]
            tags = matched["tags"]
            chunk_type = matched["chunk_type"]
            severity = matched["severity"]
        else:
            disease_name = topic.replace("_", " ").title()
            aliases = [topic.lower()]
            tags = [topic.lower()]
            chunk_type = "overview"
            severity = "refer"

        chunk_id = f"msf_portal_{topic}"
        section_ref = f"MSF Medical Guidelines Portal — {disease_name}"

        headed_text = (
            f"SOURCE: MSF Medical Guidelines Portal (Live)\n"
            f"SECTION: {section_ref}\n"
            f"DISEASE: {disease_name}\n"
            f"URL: {url}\n"
            "---\n"
            f"{text}"
        )

        chunks.append({
            "id": chunk_id,
            "text": headed_text,
            "source": "MSF",
            "source_document": "MSF Portal",
            "section_ref": section_ref,
            "disease_name": disease_name,
            "disease_aliases": aliases,
            "condition_tags": tags,
            "chunk_type": chunk_type,
            "severity_level": severity,
            "patient_population": "all",
            "page_ref": url,
            "is_current": True,  # Portal pages are always most current
        })

    print(f"  → {len(chunks)} chunks from portal pages")
    return chunks


def parse_kala_azar_factsheet(pdf_path: str) -> list[dict]:
    """Parse MSF Kala-Azar fact sheet."""
    print("Parsing MSF Kala-Azar Fact Sheet...")
    if not os.path.exists(pdf_path):
        print(f"  Not found: {pdf_path} — skipping.")
        return []

    pages = extract_pdf_text(pdf_path)
    full_text = " ".join(t for _, t in pages).strip()
    print(f"  Extracted {len(pages)} pages ({len(full_text):,} chars)")

    headed_text = (
        "SOURCE: MSF Kala-Azar Fact Sheet\n"
        "SECTION: Visceral Leishmaniasis — Overview and Treatment\n"
        "DISEASE: Visceral Leishmaniasis\n"
        "ALIASES: kala-azar, kala azar, VL, black fever, leishmaniasis\n"
        "---\n"
        f"{full_text}"
    )

    return [{
        "id": "msf_kala_azar_factsheet",
        "text": headed_text,
        "source": "MSF",
        "source_document": "MSF Kala-Azar Fact Sheet 2011",
        "section_ref": "MSF Kala-Azar Fact Sheet — Visceral Leishmaniasis",
        "disease_name": "Visceral Leishmaniasis",
        "disease_aliases": ["kala-azar", "kala azar", "VL", "black fever", "leishmaniasis"],
        "condition_tags": ["fever", "hepatosplenomegaly", "weight loss", "East Africa", "rK39", "amphotericin"],
        "chunk_type": "overview",
        "severity_level": "refer",
        "patient_population": "all",
        "page_ref": "MSF Kala-Azar Fact Sheet",
        "is_current": False,
    }]


def main():
    raw_dir = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data", "parsed")
    os.makedirs(out_dir, exist_ok=True)

    all_chunks: list[dict] = []

    # 1. MSF Clinical Guidelines 2021
    all_chunks += parse_clinical_guidelines(
        os.path.join(raw_dir, "msf_clinical_guidelines_2021.pdf")
    )

    # 2. MSF NCD Guidelines 2025
    all_chunks += parse_ncd_guidelines(
        os.path.join(raw_dir, "msf_ncd_guidelines_2025.pdf")
    )

    # 3. Portal pages
    all_chunks += parse_portal_pages(raw_dir)

    # 4. Kala-Azar fact sheet
    all_chunks += parse_kala_azar_factsheet(
        os.path.join(raw_dir, "msf_kala_azar_factsheet.pdf")
    )

    out_path = os.path.join(out_dir, "parsed_msf.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Done! {len(all_chunks)} MSF chunks written to {out_path}")
    for c in all_chunks:
        print(f"   [{c['chunk_type']:18s}] {c['disease_name']} — {c['source_document']}")


if __name__ == "__main__":
    main()
