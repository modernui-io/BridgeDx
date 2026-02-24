"""
Unit tests for Scenario A (Visceral Leishmaniasis) retrieval pipeline.
These test the query expansion and context trimming logic WITHOUT requiring
a running server, Chroma, or BM25 index.

    cd /Users/bibekpoudel/Work/MedGemmaHackathon && python -m pytest tests/test_scenario_a.py -v
"""
import sys
from pathlib import Path

# Ensure backend root is on sys.path so config / services imports resolve
BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))


# ---------- 1. Query expansion ----------

def test_expand_query_adds_vl_on_prolonged_fever_and_swollen_belly():
    """Scenario A complaint should expand to include 'visceral leishmaniasis' and 'kala-azar'."""
    from services.rag.query_expander import expand_query

    complaint = (
        "Fever for 19 days, no response to antimalarials. "
        "Swollen belly, weight loss over 2 months. "
        "Child is weak, poor appetite. No cough. No diarrhoea."
    )
    expanded = expand_query(complaint, mode="standard")

    assert "visceral leishmaniasis" in expanded, (
        f"'visceral leishmaniasis' not found in expanded query: {expanded}"
    )
    assert "kala-azar" in expanded or "kala azar" in expanded, (
        f"'kala-azar' not found in expanded query: {expanded}"
    )


def test_expand_query_adds_vl_on_antimalarial_nonresponse():
    """'no response to antimalarials' alone should trigger VL expansion."""
    from services.rag.query_expander import expand_query

    complaint = "Fever for 3 weeks, no response to antimalarials."
    expanded = expand_query(complaint, mode="standard")

    assert "visceral leishmaniasis" in expanded, (
        f"'visceral leishmaniasis' not found in expanded query: {expanded}"
    )


# ---------- 2. Context trimming ----------

# The canonical MSF VL parent chunk text (abridged to the relevant section)
_MSF_VL_TEXT = (
    "SOURCE: MSF Clinical Guidelines 2021\n"
    "SECTION: MSF Clinical Guidelines — Visceral Leishmaniasis\n"
    "DISEASE: Visceral Leishmaniasis\n"
    "ALIASES: kala-azar, kala azar, VL, visceral leishmaniasis, leishmaniasis, black fever\n"
    "---\n"
    "The leishmaniases are a group of parasitic diseases caused by protozoa of the genus Leishmania, "
    "transmitted by the bite of a sandfly. Over 20 species cause disease in man.\n"
    "Visceral leishmaniasis (kala azar) is a systemic disease, resulting in pancytopenia, "
    "immunosuppression, and death if left untreated.\n"
    "Prolonged (> 2 weeks) irregular fever, splenomegaly, and weight loss are the main signs.\n"
    "Other signs include: anaemia, diarrhoea, epistaxis, lymphadenopathy, moderate hepatomegaly.\n"
    "Bacterial diarrhoea, pneumonia, and tuberculosis may develop due to immunosuppression.\n"
    "Cutaneous leishmaniasis is endemic in more than 70 countries.\n"
    "Mucocutaneous leishmaniasis occurs in Latin America.\n"
    "Clinical features include single or multiple lesions on uncovered parts of the body.\n"
    "Serological diagnosis: rK39 dipstick test can be used for diagnosis of primary visceral leishmaniasis.\n"
)

_MSF_VL_METADATA = {
    "source": "MSF",
    "disease_name": "Visceral Leishmaniasis",
    "disease_aliases": "kala-azar,kala azar,VL,visceral leishmaniasis,leishmaniasis,black fever",
}


def test_trimming_keeps_key_vl_diagnostic_sentence():
    """
    _select_relevant_text must preserve the key diagnostic sentence:
      'Prolonged (> 2 weeks) irregular fever, splenomegaly, and weight loss are the main signs.'
    even after sentence extraction and truncation.
    """
    from services.rag.pipeline import _select_relevant_text

    query = (
        "fever for 19 days no response to antimalarials swollen belly "
        "weight loss child weak poor appetite visceral leishmaniasis kala-azar "
        "abdominal distension hepatosplenomegaly splenomegaly cachexia wasting"
    )

    trimmed = _select_relevant_text(_MSF_VL_TEXT, query, metadata=_MSF_VL_METADATA)

    assert "prolonged" in trimmed.lower(), (
        f"Key sentence about 'prolonged fever' was trimmed:\n{trimmed}"
    )
    assert "splenomegaly" in trimmed.lower(), (
        f"Key sentence about 'splenomegaly' was trimmed:\n{trimmed}"
    )
    assert "weight loss" in trimmed.lower(), (
        f"Key sentence about 'weight loss' was trimmed:\n{trimmed}"
    )


def test_trimming_preserves_header():
    """Headers (SOURCE/SECTION/DISEASE/ALIASES) must survive trimming."""
    from services.rag.pipeline import _select_relevant_text

    query = "fever splenomegaly weight loss visceral leishmaniasis"
    trimmed = _select_relevant_text(_MSF_VL_TEXT, query, metadata=_MSF_VL_METADATA)

    assert "SOURCE: MSF" in trimmed
    assert "DISEASE: Visceral Leishmaniasis" in trimmed


def test_trimming_keeps_vl_abbreviation():
    """With min-token-length=2, 'VL' should now be included in token matching."""
    from services.rag.pipeline import _select_relevant_text

    text = (
        "SOURCE: MSF\n"
        "DISEASE: VL\n"
        "---\n"
        "VL is a systemic disease resulting in pancytopenia. "
        "It is endemic in South Asia. "
        "Treatment involves liposomal amphotericin B."
    )
    query = "VL visceral leishmaniasis"
    trimmed = _select_relevant_text(text, query, metadata={"disease_name": "VL"})

    assert "VL" in trimmed, f"'VL' abbreviation was lost in trimming:\n{trimmed}"
