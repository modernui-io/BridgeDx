import re
from difflib import SequenceMatcher

def is_substring_fuzzy(excerpt: str, context: str, threshold: float = 0.70) -> bool:
    """
    Verifies if excerpt exists in context allowing for minor differences.
    """
    if not excerpt or not context:
        return False
        
    excerpt = excerpt.strip().lower()
    context = context.lower()
    
    # Exact match check first for speed
    if excerpt in context:
        return True
        
    # Remove excessive whitespace/punctuation
    clean_excerpt = re.sub(r'[^a-z0-9]', '', excerpt)
    clean_context = re.sub(r'[^a-z0-9]', '', context)
    
    if clean_excerpt in clean_context:
        return True
        
    # Fuzzy match using SequenceMatcher
    # We look for a block in context that matches the excerpt well
    seq = SequenceMatcher(None, clean_excerpt, clean_context)
    match = seq.find_longest_match(0, len(clean_excerpt), 0, len(clean_context))
    
    if match.size / len(clean_excerpt) > threshold:
        return True
        
    return False

def extract_context_key(ref_string: str) -> str:
    """Extract 'CONTEXT 2' from a string like '[CONTEXT 2] WHO IMCI'"""
    match = re.search(r'(CONTEXT\s+\d+)', ref_string, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return ""

def check_excerpt_faithfulness(response: dict, context_chunks: list[dict]) -> tuple[bool, list[dict]]:
    """
    For each flag in the response, verify that the excerpt actually
    appears in the claimed context chunk.
    """
    violations = []
    context_texts = {f"CONTEXT {i+1}": chunk["text"] 
                    for i, chunk in enumerate(context_chunks)}
    
    differential = response.get("differential", [])
    if not differential:
        return True, []
        
    for condition in differential:
        for flag in condition.get("flags", []):
            ref = flag.get("source_ref", "")
            excerpt = flag.get("excerpt", "")
            
            ctx_key = extract_context_key(ref)
            ctx_text = context_texts.get(ctx_key, "")
            
            if not ctx_text or not is_substring_fuzzy(excerpt, ctx_text):
                violations.append({
                    "condition": condition.get("name", "Unknown"),
                    "flag": flag.get("label", "Unknown"),
                    "claimed_source": ref,
                    "excerpt": excerpt,
                    "verdict": "EXCERPT_NOT_FOUND_IN_SOURCE"
                })
                
    return len(violations) == 0, violations

def remove_unfaithful_flags(response: dict, violations: list[dict]) -> dict:
    """
    Removes flags that failed the faithfulness check and downgrades confidence.
    """
    bad_excerpts = {v["excerpt"] for v in violations}
    
    for condition in response.get("differential", []):
        original_flags = condition.get("flags", [])
        safe_flags = [f for f in original_flags if f.get("excerpt") not in bad_excerpts]
        condition["flags"] = safe_flags
        
        # Downgrade confidence since evidence was hallucinated
        if len(safe_flags) < len(original_flags):
            condition["confidence_pct"] = max(1, condition.get("confidence_pct", 0) - 15)
            
    return response
