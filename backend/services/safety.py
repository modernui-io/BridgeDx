from typing import Tuple, List, Dict, Any

# Hard-coded rules that OVERRIDE the AI if matched
EMERGENCY_VITALS = [
    # (condition_fn, message)
    (lambda v: v.get("temperature_c", 0) > 40.0 and v.get("age_group") == "infant",
     "Temperature >40°C in infant <3 months — IMMEDIATE EMERGENCY"),
    (lambda v: v.get("temperature_c", 0) > 41.5,
     "Hyperpyrexia >41.5°C — EMERGENCY"),
    (lambda v: v.get("heart_rate_bpm", 0) and (v.get("heart_rate_bpm", 0) < 40 or v.get("heart_rate_bpm", 0) > 200),
     "Critical heart rate — EMERGENCY"),
    (lambda v: v.get("resp_rate", 0) and v.get("resp_rate", 0) > 70,
     "Severe respiratory distress (RR >70) — EMERGENCY"),
]

EMERGENCY_KEYWORDS = [
    (["seizure", "convulsion", "fitting", "fits", "seizing"],
     "Active or recent seizure reported"),
    (["unconscious", "unresponsive", "collapsed", "not breathing", "wont wake up", "coma"],
     "Loss of consciousness — EMERGENCY"),
    (["severe bleeding", "haemorrhage", "hemorrhage", "blood everywhere", "bleeding freely"],
     "Severe haemorrhage reported"),
    (["snake bite", "snakebite", "envenomation", "poisoning", "scorpion", "spider bite"],
     "Suspected envenomation or poisoning"),
    (["cannot drink", "unable to swallow", "not feeding at all", "refusing all food"],
     "Complete feeding refusal — danger sign in infant/child"),
    (["bulging fontanelle", "stiff neck", "neck stiffness", "photophobia"],
     "Signs of meningitis — EMERGENCY"),
    (["prolonged bleeding", "bleeds easily", "bruising all over"],
     "Bleeding disorder or haemorrhagic presentation"),
]

def run_safety_check(complaint: str, vitals: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Evaluates hard-coded emergency rules against structured vitals
    and the unstructured complaint text.
    
    Returns:
        (is_emergency: bool, reasons: list of strings)
    """
    reasons = []
    
    # 1. Vital signs check
    for condition_fn, msg in EMERGENCY_VITALS:
        try:
            if condition_fn(vitals):
                reasons.append(msg)
        except Exception:
            pass  # Fail soft on malformed vitals, rely on AI
            
    # 2. Keyword check
    complaint_lower = complaint.lower()
    for keywords, msg in EMERGENCY_KEYWORDS:
        if any(kw in complaint_lower for kw in keywords):
            reasons.append(msg)
            
    return len(reasons) > 0, reasons
