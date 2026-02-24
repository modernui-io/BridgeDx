"""
scripts/parse_who_imci.py
--------------------------
Parses the official WHO IMCI Chart Booklet PDF into structured JSON.
All text is machine-extracted verbatim from the PDF — no hand-written content.

Input:  data/raw/imci_chart_booklet.pdf
Output: data/parsed/parsed_who_imci.json
"""

import os
import re
import json
import sys

def extract_pdf_text(pdf_path: str) -> list[tuple[int, str]]:
    """Extract text from each page of the PDF."""
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


def clean_text(text: str) -> str:
    """Remove CID-encoded characters and clean up whitespace."""
    # Remove (cid:NNN) sequences
    text = re.sub(r'\(cid:\d+\)', '', text)
    # Collapse multiple spaces/newlines
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


# Section definitions with page ranges and tags
# Each section maps to a range of pages in the 80-page IMCI chart booklet
SECTIONS = [
    {
        "section_code": "IMCI_1.1",
        "section_title": "General Danger Signs — Assessment and Classification",
        "pages": (5, 5),
        "condition_tags": ["danger signs", "convulsions", "lethargy", "unconscious", "vomiting", "unable to drink", "emergency", "referral"],
    },
    {
        "section_code": "IMCI_2.1",
        "section_title": "Cough or Difficult Breathing — Assessment and Classification",
        "pages": (6, 6),
        "condition_tags": ["cough", "pneumonia", "respiratory", "breathing", "chest indrawing", "stridor", "wheezing", "fast breathing"],
    },
    {
        "section_code": "IMCI_3.1",
        "section_title": "Diarrhoea — Assessment, Classification and Dehydration",
        "pages": (7, 7),
        "condition_tags": ["diarrhoea", "dehydration", "ORS", "dysentery", "bloody stool", "skin pinch", "sunken eyes"],
    },
    {
        "section_code": "IMCI_4.1",
        "section_title": "Fever — Assessment, Malaria Classification and Measles",
        "pages": (8, 9),
        "condition_tags": ["fever", "malaria", "RDT", "antimalarial", "ACT", "measles", "stiff neck", "danger signs"],
    },
    {
        "section_code": "IMCI_5.1",
        "section_title": "Ear Problem — Assessment and Classification",
        "pages": (10, 10),
        "condition_tags": ["ear", "otitis media", "ear discharge", "ear pain", "mastoiditis", "ear infection"],
    },
    {
        "section_code": "IMCI_6.1",
        "section_title": "Malnutrition and Anaemia — Assessment and Classification",
        "pages": (11, 12),
        "condition_tags": ["malnutrition", "anaemia", "MUAC", "wasting", "oedema", "SAM", "MAM", "vitamin A", "iron", "pallor", "weight-for-age"],
    },
    {
        "section_code": "IMCI_7.1",
        "section_title": "HIV — Assessment, Classification and Testing",
        "pages": (13, 14),
        "condition_tags": ["HIV", "AIDS", "ART", "cotrimoxazole", "opportunistic infections", "PCR", "virological test"],
    },
    {
        "section_code": "IMCI_8.1",
        "section_title": "Immunization Status Check",
        "pages": (15, 15),
        "condition_tags": ["immunization", "vaccine", "BCG", "OPV", "DPT", "measles vaccine", "vitamin A", "EPI schedule"],
    },
    {
        "section_code": "IMCI_9.1",
        "section_title": "Assess Other Problems and Refer",
        "pages": (16, 16),
        "condition_tags": ["referral", "other problems", "assessment"],
    },
    {
        "section_code": "IMCI_10.1",
        "section_title": "Oral Drug Administration at Home — Antibiotics and Antimalarials",
        "pages": (17, 18),
        "condition_tags": ["antibiotic", "amoxicillin", "antimalarial", "ACT", "artemether-lumefantrine", "oral drugs", "dosing", "home treatment"],
    },
    {
        "section_code": "IMCI_10.2",
        "section_title": "Treat Local Infections at Home — Mouth, Eye, Ear, Skin",
        "pages": (19, 19),
        "condition_tags": ["mouth ulcers", "eye infection", "ear infection", "skin infection", "gentian violet", "tetracycline", "home treatment"],
    },
    {
        "section_code": "IMCI_10.3",
        "section_title": "Vitamin A and Mebendazole — Clinic Treatments",
        "pages": (20, 20),
        "condition_tags": ["vitamin A", "mebendazole", "deworming", "supplementation"],
    },
    {
        "section_code": "IMCI_11.1",
        "section_title": "Emergency Clinic Treatments — Artesunate, Quinine, Antibiotics",
        "pages": (21, 22),
        "condition_tags": ["artesunate", "quinine", "severe malaria", "antibiotics", "IM injection", "pre-referral", "hypoglycaemia", "emergency"],
    },
    {
        "section_code": "IMCI_12.1",
        "section_title": "Diarrhoea Treatment — Plan B (Some Dehydration) with ORS",
        "pages": (23, 23),
        "condition_tags": ["ORS", "Plan B", "some dehydration", "rehydration", "oral rehydration salts"],
    },
    {
        "section_code": "IMCI_12.2",
        "section_title": "Diarrhoea Treatment — Plan C (Severe Dehydration) IV Fluids",
        "pages": (24, 24),
        "condition_tags": ["Plan C", "severe dehydration", "IV fluids", "Ringer's Lactate", "normal saline", "rehydration"],
    },
    {
        "section_code": "IMCI_13.1",
        "section_title": "Ready-to-Use Therapeutic Food (RUTF) for Severe Malnutrition",
        "pages": (25, 25),
        "condition_tags": ["RUTF", "therapeutic food", "severe acute malnutrition", "SAM", "outpatient", "nutritional rehabilitation"],
    },
    {
        "section_code": "IMCI_14.1",
        "section_title": "HIV Treatment — ART Initiation, ARV Regimens and Dosing",
        "pages": (26, 31),
        "condition_tags": ["HIV", "ART", "ARV", "antiretroviral", "lopinavir", "ritonavir", "cotrimoxazole", "side effects", "pain relief"],
    },
    {
        "section_code": "IMCI_15.1",
        "section_title": "Follow-Up Care — Acute Conditions (Dysentery, Pneumonia, Malaria, Ear, Malnutrition)",
        "pages": (32, 34),
        "condition_tags": ["follow-up", "dysentery", "pneumonia", "malaria", "ear infection", "malnutrition", "persistent diarrhoea", "anaemia"],
    },
    {
        "section_code": "IMCI_15.2",
        "section_title": "Follow-Up Care — HIV Exposed and Infected Child",
        "pages": (35, 36),
        "condition_tags": ["HIV", "follow-up", "ART", "virological test", "cotrimoxazole", "adherence"],
    },
    {
        "section_code": "IMCI_16.1",
        "section_title": "Feeding Counselling — Assessment, Recommendations by Age",
        "pages": (37, 41),
        "condition_tags": ["feeding", "breastfeeding", "complementary feeding", "nutrition", "infant feeding", "counselling", "HIV exposed"],
    },
    {
        "section_code": "IMCI_16.2",
        "section_title": "Extra Fluids During Illness and Mother's Health",
        "pages": (42, 42),
        "condition_tags": ["fluids", "illness", "mother's health", "nutrition during illness"],
    },
    {
        "section_code": "IMCI_17.1",
        "section_title": "When to Return — Danger Signs and Follow-Up Visits",
        "pages": (43, 43),
        "condition_tags": ["danger signs", "return visit", "emergency", "follow-up", "caretaker counselling"],
    },
    {
        "section_code": "IMCI_20.1",
        "section_title": "Sick Young Infant (0-2 months) — Assessment for Serious Illness",
        "pages": (44, 45),
        "condition_tags": ["neonate", "newborn", "infant", "bacterial infection", "sepsis", "temperature", "fontanelle", "grunting", "fast breathing"],
    },
    {
        "section_code": "IMCI_20.2",
        "section_title": "Young Infant — Jaundice Assessment and Classification",
        "pages": (46, 46),
        "condition_tags": ["jaundice", "neonatal jaundice", "hyperbilirubinaemia", "phototherapy", "young infant"],
    },
    {
        "section_code": "IMCI_20.3",
        "section_title": "Young Infant — HIV Assessment",
        "pages": (47, 47),
        "condition_tags": ["HIV", "young infant", "virological test", "cotrimoxazole", "ARV prophylaxis"],
    },
    {
        "section_code": "IMCI_20.4",
        "section_title": "Young Infant — Feeding Problem and Low Weight Assessment",
        "pages": (48, 49),
        "condition_tags": ["feeding problem", "low weight", "breastfeeding", "attachment", "young infant", "low birth weight"],
    },
    {
        "section_code": "IMCI_20.5",
        "section_title": "Young Infant — Immunization and Vitamin A Status",
        "pages": (50, 50),
        "condition_tags": ["immunization", "young infant", "vitamin A", "BCG", "OPV", "hepatitis B"],
    },
    {
        "section_code": "IMCI_21.1",
        "section_title": "Young Infant Treatment — Antibiotics, Warming, ARV",
        "pages": (51, 53),
        "condition_tags": ["antibiotics", "IM injection", "ampicillin", "gentamicin", "warmth", "kangaroo care", "ARV prophylaxis", "young infant"],
    },
    {
        "section_code": "IMCI_21.2",
        "section_title": "Young Infant — Home Care for Low Weight Infant",
        "pages": (54, 55),
        "condition_tags": ["low weight", "kangaroo mother care", "KMC", "home care", "breastfeeding", "young infant"],
    },
    {
        "section_code": "IMCI_22.1",
        "section_title": "Young Infant Follow-Up — Bacterial Infection, Jaundice, Thrush, Weight",
        "pages": (56, 58),
        "condition_tags": ["follow-up", "young infant", "bacterial infection", "jaundice", "thrush", "diarrhoea", "feeding", "weight"],
    },
    {
        "section_code": "IMCI_23.1",
        "section_title": "Skin Problems — Identification and Treatment",
        "pages": (59, 63),
        "condition_tags": ["skin", "rash", "itching", "scabies", "ringworm", "eczema", "impetigo", "abscess", "herpes", "drug reaction"],
    },
]


def main():
    pdf_path = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "imci_chart_booklet.pdf")
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data", "parsed")
    os.makedirs(out_dir, exist_ok=True)

    if not os.path.exists(pdf_path):
        print(f"ERROR: IMCI PDF not found at {pdf_path}")
        sys.exit(1)

    print("Extracting text from WHO IMCI Chart Booklet PDF...")
    pages = extract_pdf_text(pdf_path)
    print(f"  Extracted {len(pages)} pages.")

    result = []

    for section in SECTIONS:
        start_page, end_page = section["pages"]
        # Collect text from the page range (1-indexed)
        section_text_parts = []
        for page_num, text in pages:
            if start_page <= page_num <= end_page:
                cleaned = clean_text(text)
                if cleaned:
                    section_text_parts.append(cleaned)

        full_text = "\n\n".join(section_text_parts)

        if not full_text.strip():
            print(f"  WARNING: No text extracted for {section['section_title']} (pages {start_page}-{end_page})")
            continue

        # Prepend a context header for embedding quality
        headed_text = (
            f"SOURCE: WHO IMCI Chart Booklet (March 2014)\n"
            f"SECTION: {section['section_title']}\n"
            f"PAGES: {start_page}-{end_page}\n"
            "---\n"
            f"{full_text}"
        )

        entry = {
            "section_code": section["section_code"],
            "section_title": section["section_title"],
            "text": headed_text,
            "condition_tags": section["condition_tags"],
            "page_range": f"p. {start_page}-{end_page}",
        }
        result.append(entry)
        print(f"  ✓ {section['section_code']:12s} {section['section_title'][:60]:60s} ({len(full_text):,} chars, pages {start_page}-{end_page})")

    out_path = os.path.join(out_dir, "parsed_who_imci.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Done! {len(result)} WHO IMCI sections written to {out_path}")
    total_chars = sum(len(e["text"]) for e in result)
    print(f"   Total text: {total_chars:,} characters (~{total_chars // 4:,} tokens)")


if __name__ == "__main__":
    main()
