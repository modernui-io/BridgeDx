from sqlmodel import SQLModel, Field, Session, create_engine
from typing import Optional, List
from datetime import datetime
from config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)

class CaseRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: str = Field(index=True, unique=True)
    assessment_id: str = Field(index=True)
    
    # Fully de-identified inputs
    age_group: str
    sex: str
    region_district: Optional[str] = None
    mode: str
    has_image: bool = False
    temperature_c: Optional[float] = None
    
    # Triage decision
    triage_level: str
    triage_detail: Optional[str] = None
    triage_protocol: Optional[str] = None
    confidence_high: bool
    emergency_triggered: bool = False
    
    # CHW feedback
    chw_impression: str
    notes: Optional[str] = None
    differential_json: Optional[str] = None
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    _ensure_case_record_columns()

def _ensure_case_record_columns():
    """Lightweight SQLite migration for new columns used in the demo."""
    table_name = "caserecord"
    with engine.connect() as conn:
        cols = conn.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()
        existing = {c[1] for c in cols}
        additions = {
            "triage_detail": "TEXT",
            "triage_protocol": "TEXT",
            "notes": "TEXT",
            "differential_json": "TEXT",
        }
        for col, col_type in additions.items():
            if col not in existing:
                conn.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {col} {col_type}")

def get_session():
    with Session(engine) as session:
        yield session
