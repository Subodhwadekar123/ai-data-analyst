"""
AI Data Analyst - Database Setup
==================================
SQLAlchemy database configuration.
Provides session management, base model class, and all ORM models.

Tables:
  - users              (extended with auth fields)
  - sessions           (active sessions per device)
  - refresh_tokens     (rotatable refresh tokens)
  - email_verification_tokens
  - password_reset_tokens
  - login_history      (every login attempt)
  - audit_logs         (security audit trail)
  - datasets           (existing)
  - analysis_results   (existing)
  - ml_experiments     (existing)
  - issues             (existing)
"""

from sqlalchemy import (
    create_engine, Column, String, Integer, DateTime,
    Text, Float, Boolean, ForeignKey, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime
from typing import Generator
from app.config import settings

# ── Engine & Session ─────────────────────────────────────────────────────────
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# ── Auth ORM Models ──────────────────────────────────────────────────────────

class UserRecord(Base):
    """Core user table — stores auth credentials and profile information."""
    __tablename__ = "users"

    # Identity
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)

    # Auth
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)     # "user" | "admin"
    is_admin = Column(Boolean, default=False)                 # kept for backward compat

    # Account Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)              # email verified
    is_suspended = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)               # soft delete
    suspension_reason = Column(Text, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    suspended_at = Column(DateTime, nullable=True)

    # Login Tracking
    last_login = Column(DateTime, nullable=True)
    last_logout = Column(DateTime, nullable=True)
    login_count = Column(Integer, default=0)
    failed_login_attempts = Column(Integer, default=0)
    lockout_until = Column(DateTime, nullable=True)

    # Legacy session token (kept for backward compat — new code uses sessions table)
    session_token = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sessions = relationship("SessionRecord", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshTokenRecord", back_populates="user", cascade="all, delete-orphan")
    email_tokens = relationship("EmailVerificationToken", back_populates="user", cascade="all, delete-orphan")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    login_history = relationship("LoginHistory", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    datasets = relationship("DatasetRecord", back_populates="user", cascade="all, delete-orphan")


class SessionRecord(Base):
    """Tracks every active user session (one per device/browser)."""
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)          # UUID session ID
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_token = Column(String, unique=True, index=True, nullable=False)

    # Device Info
    browser = Column(String, nullable=True)
    browser_version = Column(String, nullable=True)
    os = Column(String, nullable=True)
    os_version = Column(String, nullable=True)
    device_type = Column(String, nullable=True)   # desktop | mobile | tablet | bot
    device_name = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)

    # Network
    ip_address = Column(String, nullable=True)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)

    # Lifecycle
    is_active = Column(Boolean, default=True)
    remember_me = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    # Relationship
    user = relationship("UserRecord", back_populates="sessions")
    refresh_token = relationship("RefreshTokenRecord", back_populates="session", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_sessions_user_active", "user_id", "is_active"),
    )


class RefreshTokenRecord(Base):
    """Rotatable refresh tokens — one per session."""
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    token_hash = Column(String, unique=True, index=True, nullable=False)  # hashed for storage
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    replaced_by = Column(String, nullable=True)   # ID of replacement token (rotation chain)

    # Relationships
    user = relationship("UserRecord", back_populates="refresh_tokens")
    session = relationship("SessionRecord", back_populates="refresh_token")


class EmailVerificationToken(Base):
    """Time-limited tokens for email verification."""
    __tablename__ = "email_verification_tokens"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

    # Relationship
    user = relationship("UserRecord", back_populates="email_tokens")


class PasswordResetToken(Base):
    """Single-use expiring tokens for password reset."""
    __tablename__ = "password_reset_tokens"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    ip_address = Column(String, nullable=True)  # IP that requested reset

    # Relationship
    user = relationship("UserRecord", back_populates="reset_tokens")


class LoginHistory(Base):
    """Complete record of every login attempt (success and failure)."""
    __tablename__ = "login_history"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String, nullable=True)   # null on failed login
    email = Column(String, nullable=False, index=True)

    # Timing
    login_time = Column(DateTime, default=datetime.utcnow, index=True)
    logout_time = Column(DateTime, nullable=True)
    session_duration_seconds = Column(Integer, nullable=True)

    # Device & Network
    browser = Column(String, nullable=True)
    browser_version = Column(String, nullable=True)
    os = Column(String, nullable=True)
    os_version = Column(String, nullable=True)
    device_type = Column(String, nullable=True)
    device_name = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)

    # Outcome
    auth_method = Column(String, default="email_password")
    success = Column(Boolean, default=True)
    failure_reason = Column(String, nullable=True)

    # Relationship
    user = relationship("UserRecord", back_populates="login_history")

    __table_args__ = (
        Index("ix_login_history_user_time", "user_id", "login_time"),
        Index("ix_login_history_ip", "ip_address"),
    )


class AuditLog(Base):
    """Security audit trail for all significant events."""
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Who
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_email = Column(String, nullable=True)
    admin_id = Column(String, nullable=True)    # If action was performed by admin

    # What
    action = Column(String, nullable=False, index=True)   # e.g. "LOGIN", "PASSWORD_RESET"
    description = Column(Text, nullable=True)
    severity = Column(String, default="INFO")              # INFO | WARNING | CRITICAL

    # Context
    ip_address = Column(String, nullable=True)
    browser = Column(String, nullable=True)
    device = Column(String, nullable=True)
    extra_data = Column(Text, nullable=True)               # JSON blob for extra context

    # Relationship
    user = relationship("UserRecord", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_logs_action_time", "action", "timestamp"),
    )


# ── Application ORM Models (existing) ────────────────────────────────────────

class DatasetRecord(Base):
    """Stores metadata about uploaded datasets."""
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, index=True)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    file_type = Column(String, nullable=False)
    rows = Column(Integer, nullable=True)
    columns = Column(Integer, nullable=True)
    memory_usage_mb = Column(Float, nullable=True)
    status = Column(String, default="uploaded")
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("UserRecord", back_populates="datasets")


class AnalysisResult(Base):
    """Caches analysis results for a dataset."""
    __tablename__ = "analysis_results"

    id = Column(String, primary_key=True, index=True)
    dataset_id = Column(String, nullable=False, index=True)
    analysis_type = Column(String, nullable=False)
    result_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class MLExperiment(Base):
    """Stores ML experiment results."""
    __tablename__ = "ml_experiments"

    id = Column(String, primary_key=True, index=True)
    dataset_id = Column(String, nullable=False, index=True)
    problem_type = Column(String, nullable=False)
    algorithm = Column(String, nullable=False)
    target_column = Column(String, nullable=True)
    metrics_json = Column(Text, nullable=False)
    params_json = Column(Text, nullable=True)
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


# ── Database Initialization ──────────────────────────────────────────────────
def _add_column_if_missing(conn, table: str, column: str, col_type: str):
    """Helper: Add a column to an existing table if it doesn't already exist."""
    try:
        from sqlalchemy import text
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type};"))
        print(f"  [OK] Migrated: {table}.{column}")
    except Exception:
        pass   # Column already exists


def init_db() -> None:
    """Create all database tables and run migrations on existing databases with retry logic."""
    import time
    max_retries = 6
    retry_delay = 5

    # Attempt to connect and initialize database, retrying in case of container boot race conditions (e.g. Railway/PostgreSQL startup)
    for attempt in range(1, max_retries + 1):
        try:
            print(f"Connecting to database (attempt {attempt}/{max_retries})...")
            Base.metadata.create_all(bind=engine)
            break
        except Exception as e:
            if attempt == max_retries:
                print(f"[ERROR] Database initialization failed after {max_retries} attempts: {e}")
                raise e
            print(f"[WARNING] Database connection failed, retrying in {retry_delay}s... Error: {e}")
            time.sleep(retry_delay)

    # Graceful migration: add new columns to existing `users` table
    with engine.begin() as conn:
        migrations = [
            ("users", "username",               "VARCHAR"),
            ("users", "profile_picture_url",    "VARCHAR"),
            ("users", "role",                   "VARCHAR DEFAULT 'user'"),
            ("users", "is_verified",            "BOOLEAN DEFAULT 0"),
            ("users", "is_suspended",           "BOOLEAN DEFAULT 0"),
            ("users", "is_deleted",             "BOOLEAN DEFAULT 0"),
            ("users", "suspension_reason",      "TEXT"),
            ("users", "deleted_at",             "TIMESTAMP"),
            ("users", "suspended_at",           "TIMESTAMP"),
            ("users", "last_logout",            "TIMESTAMP"),
            ("users", "login_count",            "INTEGER DEFAULT 0"),
            ("users", "failed_login_attempts",  "INTEGER DEFAULT 0"),
            ("users", "lockout_until",          "TIMESTAMP"),
            ("users", "updated_at",             "TIMESTAMP"),
            ("users", "session_token",          "VARCHAR"),
            ("users", "last_login",             "TIMESTAMP"),
        ]
        for table, col, col_type in migrations:
            _add_column_if_missing(conn, table, col, col_type)

    # Seed initial admin & demo user accounts
    db = SessionLocal()
    try:
        import bcrypt
        import uuid

        # 1. Admin Account
        admin_email = "admin@infinitics.ai"
        admin_password = "SubodhW@7116"
        hashed_admin_pass = bcrypt.hashpw(admin_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        admin_exists = db.query(UserRecord).filter(UserRecord.email == admin_email).first()
        if not admin_exists:
            admin_user = UserRecord(
                id=str(uuid.uuid4()),
                email=admin_email,
                hashed_password=hashed_admin_pass,
                full_name="System Admin Subodh",
                username="admin_subodh",
                is_active=True,
                is_admin=True,
                is_verified=True,
                role="admin",
            )
            db.add(admin_user)
            print("[OK] Seeded initial admin user: admin@infinitics.ai")
        else:
            admin_exists.hashed_password = hashed_admin_pass
            admin_exists.full_name = "System Admin Subodh"
            admin_exists.is_admin = True
            admin_exists.is_verified = True
            admin_exists.role = "admin"
            print("[OK] Updated admin credentials: admin@infinitics.ai")

        # 2. Standard Demo User Account
        demo_email = "user@infinitics.ai"
        demo_password = "UserPass@123"
        hashed_demo_pass = bcrypt.hashpw(demo_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        demo_exists = db.query(UserRecord).filter(UserRecord.email == demo_email).first()
        if not demo_exists:
            demo_user = UserRecord(
                id=str(uuid.uuid4()),
                email=demo_email,
                hashed_password=hashed_demo_pass,
                full_name="Demo Analyst",
                username="demo_analyst",
                is_active=True,
                is_admin=False,
                is_verified=True,
                role="user",
            )
            db.add(demo_user)
            print("[OK] Seeded demo analyst user: user@infinitics.ai")
        else:
            demo_exists.hashed_password = hashed_demo_pass
            demo_exists.full_name = "Demo Analyst"
            demo_exists.is_admin = False
            demo_exists.is_verified = True
            demo_exists.role = "user"
            print("[OK] Updated demo user credentials: user@infinitics.ai")

        db.commit()
    except Exception as e:
        print(f"Error seeding initial users: {e}")
        db.rollback()
    finally:
        db.close()


class PropertyRecord(Base):
    """Stores metadata and details about uploaded real-estate properties."""
    __tablename__ = "properties"

    id = Column(String, primary_key=True, index=True)
    property_id = Column(String, nullable=True, index=True)
    property_name = Column(String, nullable=True)
    location = Column(String, nullable=True, index=True)
    city = Column(String, nullable=True, index=True)
    property_type = Column(String, nullable=True)
    bhk = Column(Integer, nullable=True, index=True)
    price = Column(Float, nullable=True, index=True)
    price_per_sq_ft = Column(Float, nullable=True)
    area_sq_ft = Column(Float, nullable=True, index=True)
    furnishing = Column(String, nullable=True)
    parking = Column(String, nullable=True)
    amenities = Column(String, nullable=True)
    status = Column(String, nullable=True)
    dealer_name = Column(String, nullable=True)
    agent_name = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    property_url = Column(String, nullable=True)
    raw_data = Column(Text, nullable=True)  # JSON dump of original columns
    created_at = Column(DateTime, default=datetime.utcnow)


class PropertyMetadata(Base):
    """Stores metadata about the current uploaded property dataset."""
    __tablename__ = "properties_metadata"

    id = Column(String, primary_key=True, default="current_dataset")
    filename = Column(String, nullable=False)
    row_count = Column(Integer, default=0)
    uploaded_by = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Dependency Injection ──────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
