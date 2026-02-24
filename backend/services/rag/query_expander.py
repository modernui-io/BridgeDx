MEDICAL_SYNONYMS = {
    "big belly": ["abdominal distension", "hepatosplenomegaly", "organomegaly"],
    "swollen belly": ["abdominal distension", "hepatosplenomegaly", "splenomegaly"],
    "swollen abdomen": ["abdominal distension", "hepatosplenomegaly", "splenomegaly"],
    "swollen stomach": ["abdominal distension", "hepatosplenomegaly"],
    "abdominal swelling": ["abdominal distension", "hepatosplenomegaly", "splenomegaly", "organomegaly"],
    "abdominal distension": ["hepatosplenomegaly", "splenomegaly", "organomegaly"],
    "yellow skin": ["jaundice", "icterus"],
    "yellow eyes": ["jaundice", "scleral icterus"],
    "not feeding": ["feeding difficulty", "poor appetite", "anorexia"],
    "fits": ["seizure", "convulsion", "epilepsy"],
    "shaking": ["tremor", "rigors", "seizure"],
    "slow growth": ["failure to thrive", "developmental delay", "growth retardation"],
    "developmental regression": ["neurodegeneration", "developmental delay", "neurodevelopmental regression"],
    "infections": ["recurrent infections", "immunodeficiency"],
    "pale": ["pallor", "anemia", "leucodermia"],
    "weight loss": ["cachexia", "wasting"],
    "high fever": ["hyperpyrexia", "fever", "pyrexia"],
    "difficulty breathing": ["dyspnea", "respiratory distress", "tachypnea"],
    "swollen lymph nodes": ["lymphadenopathy", "adenopathy"],
}

ICD10_MAPPINGS = {
    "fever": "R50", "hepatosplenomegaly": "R16",
    "malaria": "B54", "visceral leishmaniasis": "B55.0",
    "gaucher": "E75.22", "typhoid": "A01.0",
    "developmental regression": "F84", "splenomegaly": "R16.1",
}

def expand_query(complaint: str, mode: str = "standard") -> str:
    """
    Expands raw CHW complaint text into a richer clinical query for 
    improved BM25 and vector retrieval.
    """
    expanded = complaint.lower()
    
    # 1. Apply synonym mappings
    added_terms = []
    for lay_term, clinical_terms in MEDICAL_SYNONYMS.items():
        if lay_term in expanded:
            added_terms.extend(clinical_terms)

    # 1b. Heuristic disease expansion (retrieval-only)
    # Prolonged fever + hepatosplenomegaly/weight loss patterns
    if ("fever" in expanded or "pyrexia" in expanded) and (
        "weight loss" in expanded or "wasting" in expanded or "cachexia" in expanded
    ) and (
        "hepatosplenomegaly" in expanded or "splenomegaly" in expanded or "swollen belly" in expanded or "swollen abdomen" in expanded
    ):
        added_terms.extend(["visceral leishmaniasis", "kala-azar", "kala azar"])

    # Non-response to antimalarials suggests alternative prolonged fever etiologies
    if "antimalarial" in expanded or "antimalarials" in expanded or "malaria treatment" in expanded:
        if "no response" in expanded or "not responding" in expanded or "no improvement" in expanded:
            added_terms.extend(["visceral leishmaniasis", "kala-azar", "kala azar", "typhoid"])

    # Chronic organomegaly + developmental regression/recurrent infections → storage diseases
    has_organomegaly = any(t in expanded or t in " ".join(added_terms) for t in (
        "hepatosplenomegaly", "splenomegaly", "organomegaly",
        "abdominal swelling", "abdominal distension", "swollen belly",
    ))
    has_neuro = any(t in expanded for t in (
        "developmental regression", "regression", "neurodegeneration",
        "developmental delay",
    ))
    has_infections = "recurrent infections" in expanded or "infections" in expanded
    has_pallor = "pale" in expanded or "pallor" in expanded or "anemia" in expanded

    if has_organomegaly and (has_neuro or (has_infections and has_pallor)):
        added_terms.extend([
            "lysosomal storage disease", "Gaucher disease", "glucocerebrosidase",
            "Niemann-Pick disease", "sphingolipidosis",
            "hepatosplenomegaly", "pancytopenia", "thrombocytopenia",
        ])

    # 2. Add ICD-10 tags
    for kw, code in ICD10_MAPPINGS.items():
        if kw in expanded or kw in " ".join(added_terms):
            added_terms.append(f"[{code}]")
            
    # Combine original and expanded terms
    if added_terms:
        # Avoid simple duplication, but append all synonyms
        expanded = f"{expanded} " + " ".join(set(added_terms))
        
    return expanded
