"""
AI Data Analyst - Database Setup
==================================
SQLAlchemy async database configuration with SQLite.
Provides session management and base model class.
"""

from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, Float, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
from typing import Generator
from app.config import settings

# ── Engine & Session ─────────────────────────────────────────────────────────
# Only use SQLite-specific args if connecting to an SQLite database
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# ── ORM Models ────────────────────────────────────────────────────────────────
class DatasetRecord(Base):
    """Stores metadata about uploaded datasets."""
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, index=True)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    file_type = Column(String, nullable=False)   # csv / xlsx
    rows = Column(Integer, nullable=True)
    columns = Column(Integer, nullable=True)
    memory_usage_mb = Column(Float, nullable=True)
    status = Column(String, default="uploaded")  # uploaded / analyzed / cleaned
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AnalysisResult(Base):
    """Caches analysis results for a dataset."""
    __tablename__ = "analysis_results"

    id = Column(String, primary_key=True, index=True)
    dataset_id = Column(String, nullable=False, index=True)
    analysis_type = Column(String, nullable=False)  # eda / stats / ml / cleaning
    result_json = Column(Text, nullable=False)       # JSON-serialized results
    created_at = Column(DateTime, default=datetime.utcnow)


class MLExperiment(Base):
    """Stores ML experiment results."""
    __tablename__ = "ml_experiments"

    id = Column(String, primary_key=True, index=True)
    dataset_id = Column(String, nullable=False, index=True)
    problem_type = Column(String, nullable=False)    # regression / classification / clustering
    algorithm = Column(String, nullable=False)
    target_column = Column(String, nullable=True)
    metrics_json = Column(Text, nullable=False)      # JSON metrics
    params_json = Column(Text, nullable=True)        # Hyperparameters used
    created_at = Column(DateTime, default=datetime.utcnow)


class IssueRecord(Base):
    """Stores user-submitted issue reports."""
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    email = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserRecord(Base):
    """Stores authentication and user profiles."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Database Initialization ──────────────────────────────────────────────────
def init_db() -> None:
    """Create all database tables and seed initial admin user."""
    Base.metadata.create_all(bind=engine)

    # Seed admin user if none exists
    db = SessionLocal()
    try:
        admin_email = "admin@datamind.ai"
        exists = db.query(UserRecord).filter(UserRecord.email == admin_email).first()
        import bcrypt
        hashed_pass = bcrypt.hashpw("SubodhW@7116".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        if not exists:
            import uuid
            admin_user = UserRecord(
                id=str(uuid.uuid4()),
                email=admin_email,
                hashed_password=hashed_pass,
                full_name="System Admin Subodh",
                is_active=True,
                is_admin=True
            )
            db.add(admin_user)
            db.commit()
            print("🚀 Seeded initial admin user: admin@datamind.ai")
        else:
            exists.hashed_password = hashed_pass
            exists.full_name = "System Admin Subodh"
            db.commit()
            print("🚀 Updated admin password and name to matching seed: admin@datamind.ai")
    except Exception as e:
        print(f"Error seeding admin user: {e}")
        db.rollback()
    finally:
        db.close()


# ── Dependency Injection ──────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
