import re
from typing import Dict, Any

def scrub_pii(text: str) -> str:
    """
    A basic PII scrubber for chief complaints before storing them
    in logs or sending to external models (if not HIPAA compliant).
    
    In a real production system, this would use a dedicated NLP model 
    like Microsoft Presidio to detect names, addresses, and phone numbers.
    """
    # Remove phone numbers (very basic regex)
    text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE REDACTED]', text)
    
    # Remove obvious dates of birth (DOB)
    text = re.sub(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', '[DATE REDACTED]', text)
    
    # Remove basic SSN/ID formats
    text = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[ID REDACTED]', text)
    
    return text

def deidentify_case_data(case_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Prepare data for SQLite storage by removing specific ages
    and converting them to buckets, and removing exact locations.
    """
    safe_data = {
        "age_group": case_data.get("age_group", "unknown"),
        "sex": case_data.get("sex", "unknown"),
        "mode": case_data.get("mode", "standard"),
        "has_image": bool(case_data.get("image_file_key")),
        "temperature_c": case_data.get("temperature_c"),
    }
    
    # Only keep district/broad region, not specific village or address
    region = case_data.get("region_district", "")
    if region:
        # If there's a comma (e.g., "Village X, District Y"), keep only the last part
        safe_data["region_district"] = region.split(",")[-1].strip()
        
    return safe_data
