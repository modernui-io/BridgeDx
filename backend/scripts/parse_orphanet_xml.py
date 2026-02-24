import xml.etree.ElementTree as ET
import json
import os
from collections import defaultdict

def parse_orphanet_data():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data", "parents")
    prod1_path = os.path.join(data_dir, "en_product1.xml")
    prod4_path = os.path.join(data_dir, "en_product4.xml")
    out_path = os.path.join(data_dir, "parsed_orphanet.json")

    print(f"Parsing nomenclature from {prod1_path}...")
    diseases = {}
    
    try:
        tree1 = ET.parse(prod1_path)
        root1 = tree1.getroot()
        for disorder in root1.findall(".//Disorder"):
            orpha_code = disorder.find("OrphaCode").text if disorder.find("OrphaCode") is not None else ""
            name_node = disorder.find("Name")
            name = name_node.text if name_node is not None else ""
            
            synonyms = []
            for syn in disorder.findall(".//Synonym"):
                if syn.text:
                    synonyms.append(syn.text)
                    
            if orpha_code:
                diseases[orpha_code] = {
                    "name": name,
                    "orpha_code": f"ORPHA:{orpha_code}",
                    "synonyms": synonyms,
                    "clinical_signs": [],
                    "diagnostic_criteria": "",
                    "differential_dx": "",
                    "prevalence": "Unknown" # Need product 2 for epidemiology, but preserving what we can from 1 and 4
                }
    except Exception as e:
        print(f"Error parsing product 1: {e}")
        return

    print(f"Parsing clinical signs from {prod4_path}...")
    try:
        tree4 = ET.parse(prod4_path)
        root4 = tree4.getroot()
        for disorder in root4.findall(".//Disorder"):
            orpha_code = disorder.find("OrphaCode").text if disorder.find("OrphaCode") is not None else ""
            if not orpha_code or orpha_code not in diseases:
                continue
                
            signs_by_freq = defaultdict(list)
            for assoc in disorder.findall(".//HPODisorderAssociation"):
                term = assoc.find(".//HPOTerm")
                freq = assoc.find(".//HPOFrequency/Name")
                
                term_text = term.text if term is not None else ""
                freq_text = freq.text if freq is not None else "Unknown frequency"
                
                if term_text:
                    signs_by_freq[freq_text].append(term_text)
                    
            
            # Format signs into a readable string for the LLM RAG
            signs_text_parts = []
            features_raw = []
            for freq, terms in signs_by_freq.items():
                signs_text_parts.append(f"{freq}: {', '.join(terms)}.")
                features_raw.extend(terms)
                
            diseases[orpha_code]["clinical_signs"] = " ".join(signs_text_parts) if signs_text_parts else "No detailed clinical signs available."
            # Also store the raw features in diagnostic criteria to ensure 100% preservation of traits
            if features_raw:
                diseases[orpha_code]["diagnostic_criteria"] = f"Phenotypic features include: {', '.join(features_raw)}."
    except Exception as e:
        print(f"Error parsing product 4: {e}")
        return

    print("Writing combined output...")
    # Convert to list
    final_list = list(diseases.values())
    with open(out_path, "w") as f:
        json.dump(final_list, f, indent=2)
        
    print(f"Successfully preserved {len(final_list)} rare diseases to {out_path}.")

if __name__ == "__main__":
    parse_orphanet_data()
