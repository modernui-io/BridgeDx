import re
from config import settings

def chunk_text(text: str, chunk_size: int = settings.RAG_CHILD_CHUNK_SIZE, overlap: int = settings.RAG_CHILD_OVERLAP) -> list[str]:
    """Basic word-based overlap chunker."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

class DocumentChunker:
    """Document-aware chunking for WHO IMCI, Orphanet, and MSF."""
    
    @staticmethod
    def chunk_who_imci(section_code: str, section_title: str, text: str, condition_tags: list[str]) -> tuple[dict, list[dict]]:
        """
        Creates 1 parent chunk and N child chunks.
        Prepends section title to ALL child chunks to preserve context.
        """
        parent_id = f"who_imci_{section_code.replace('.', '_')}"
        
        parent = {
            "id": parent_id,
            "text": f"{section_title}\n{text}",
            "metadata": {
                "source": "WHO IMCI",
                "section_code": section_code,
                "section_title": section_title,
                "condition_tags": ",".join(condition_tags)
            }
        }
        
        children = []
        raw_chunks = chunk_text(text)
        for i, c_text in enumerate(raw_chunks):
            children.append({
                "id": f"{parent_id}_child_{i}",
                "text": f"{section_title}\n{c_text}",  # Crucial context prepended
                "metadata": {
                    "source": "WHO IMCI",
                    "parent_id": parent_id,
                    "condition_tags": ",".join(condition_tags)
                }
            })
            
        return parent, children

    @staticmethod
    def chunk_orphanet(entry: dict) -> tuple[dict, list[dict]]:
        """
        Keeps discrete disease entries intact as one parent.
        Splits by structured field boundaries for children.
        """
        orpha_code = entry.get("orpha_code", "UNKNOWN")
        name = entry.get("name", "Unknown Disease")
        parent_id = f"orphanet_{orpha_code.replace(':', '_')}"
        
        full_text = f"{name} ({orpha_code})\n"
        full_text += f"Prevalence: {entry.get('prevalence', 'Unknown')}\n\n"
        
        children = []
        
        # Build structured fields and their child chunks
        for field in ["clinical_signs", "diagnostic_criteria", "differential_dx"]:
            if val := entry.get(field):
                field_text = f"{field.replace('_', ' ').title()}:\n{val}"
                full_text += f"{field_text}\n\n"
                
                # If a field is huge, chunk it, but prepend disease name
                for i, c_text in enumerate(chunk_text(field_text, chunk_size=200)):
                    children.append({
                        "id": f"{parent_id}_{field}_child_{i}",
                        "text": f"{name} ({orpha_code}) - {c_text}",
                        "metadata": {
                            "source": "ORPHANET",
                            "parent_id": parent_id,
                            "orpha_code": orpha_code,
                            "disease_name": name,
                            "chunk_type": field
                        }
                    })
                    
        parent = {
            "id": parent_id,
            "text": full_text.strip(),
            "metadata": {
                "source": "ORPHANET",
                "orpha_code": orpha_code,
                "disease_name": name,
                "synonyms": ",".join(entry.get("synonyms", []))
            }
        }
        
        return parent, children

    @staticmethod
    def chunk_msf(entry: dict) -> tuple[dict, list[dict]]:
        """
        Creates 1 parent chunk and N child chunks from a parsed MSF entry dict.
        Each child is prefixed with the disease name and source for context.
        Emergency protocol chunks are kept atomic (never split) to preserve
        the criteria → management relationship.
        """
        parent_id = entry.get("id", f"msf_{entry.get('disease_name', 'unknown').lower().replace(' ', '_')}")
        disease_name = entry.get("disease_name", "Unknown")
        source_doc = entry.get("source_document", "MSF")
        section_ref = entry.get("section_ref", "")
        text = entry.get("text", "")
        chunk_type = entry.get("chunk_type", "overview")
        pop = entry.get("patient_population", "all")
        aliases = entry.get("disease_aliases", [])
        tags = entry.get("condition_tags", [])
        severity = entry.get("severity_level", "refer")
        page_ref = entry.get("page_ref", "")
        is_current = entry.get("is_current", False)

        parent = {
            "id": parent_id,
            "text": text,
            "metadata": {
                "source": "MSF",
                "source_document": source_doc,
                "section_ref": section_ref,
                "disease_name": disease_name,
                "disease_aliases": ",".join(aliases),
                "condition_tags": ",".join(tags),
                "chunk_type": chunk_type,
                "severity_level": severity,
                "patient_population": pop,
                "page_ref": page_ref,
                "is_current": str(is_current),
            }
        }

        children = []
        context_header = f"MSF Guidelines: {disease_name} ({source_doc})\n"

        # Emergency protocols and short fact sheets: keep atomic
        if chunk_type == "emergency_protocol" or len(text.split()) <= 300:
            children.append({
                "id": f"{parent_id}_child_0",
                "text": context_header + text,
                "metadata": {
                    "source": "MSF",
                    "parent_id": parent_id,
                    "disease_name": disease_name,
                    "chunk_type": chunk_type,
                    "severity_level": severity,
                    "condition_tags": ",".join(tags),
                    "is_current": str(is_current),
                }
            })
        else:
            for i, c_text in enumerate(chunk_text(text)):
                children.append({
                    "id": f"{parent_id}_child_{i}",
                    "text": context_header + c_text,
                    "metadata": {
                        "source": "MSF",
                        "parent_id": parent_id,
                        "disease_name": disease_name,
                        "chunk_type": chunk_type,
                        "severity_level": severity,
                        "condition_tags": ",".join(tags),
                        "is_current": str(is_current),
                    }
                })

        return parent, children
