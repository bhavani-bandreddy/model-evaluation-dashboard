import datetime
import json
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import os

# SQLite Database URL (support production persistent disks)
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./history.db")
if os.path.exists("/data"):
    DATABASE_URL = "sqlite:////data/history.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_name = Column(String, index=True)
    model_name = Column(String, index=True)
    target_column = Column(String)
    evaluated_at = Column(DateTime, default=datetime.datetime.utcnow)
    accuracy = Column(Float)
    precision = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    roc_auc = Column(Float, nullable=True)
    confusion_matrix = Column(Text)  # JSON-serialized list of lists
    classification_report = Column(Text)  # JSON-serialized dict
    run_time_seconds = Column(Float)

# Create tables
def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
