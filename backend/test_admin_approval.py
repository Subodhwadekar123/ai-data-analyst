"""Approval gate tests use an isolated database, never the application database."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, UserRecord, get_db
from app.routers.auth import router


@pytest.fixture
def approval_app(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    application = FastAPI()
    application.include_router(router, prefix="/api/v1")
    from app.routers.admin import router as admin_router
    application.include_router(admin_router, prefix="/api/v1")

    def test_db():
        with factory() as db:
            yield db

    application.dependency_overrides[get_db] = test_db
    monkeypatch.setattr("app.services.auth_service.send_new_device_login_bg", lambda *a, **k: None)
    with TestClient(application) as client:
        yield client, factory, engine
    engine.dispose()


def test_pending_user_requires_approval_to_login(approval_app):
    client, factory, engine = approval_app
    assert "is_approved" in {c["name"] for c in inspect(engine).get_columns("users")}
    credentials = {"email": "pending@example.com", "password": "StrongPassword999!"}
    registration = client.post("/api/v1/auth/register", json={
        **credentials, "full_name": "Pending User", "agree_terms": True,
    })
    assert registration.status_code == 201, registration.text
    assert registration.json()["is_approved"] is False
    assert "access_token" not in registration.json()
    assert "refresh_token" not in registration.cookies

    pending_login = client.post("/api/v1/auth/login", json=credentials)
    assert pending_login.status_code == 403, pending_login.text
    assert "awaiting admin approval" in pending_login.json()["detail"]
    assert "refresh_token" not in pending_login.cookies

    with factory() as db:
        user = db.query(UserRecord).filter_by(email=credentials["email"]).one()
        assert not user.is_approved
        user.is_approved = True
        db.commit()

    approved_login = client.post("/api/v1/auth/login", json=credentials)
    assert approved_login.status_code == 200, approved_login.text
    assert approved_login.json()["access_token"]
    assert approved_login.json()["user"]["is_approved"] is True
    assert approved_login.cookies.get("refresh_token")


def test_admin_approval_api_and_access_guards(approval_app):
    from app.database import AuditLog
    client, factory, _ = approval_app
    password = "StrongPassword999!"
    ids = {}
    for name in ("admin", "member", "pending", "deleted"):
        result = client.post("/api/v1/auth/register", json={
            "email": f"{name}@example.com", "password": password, "full_name": name,
        })
        assert result.status_code == 201
        ids[name] = result.json()["user_id"]
    with factory() as db:
        for name in ("admin", "member"):
            user = db.get(UserRecord, ids[name])
            user.is_approved = True
            user.is_admin = name == "admin"
            user.role = "admin" if name == "admin" else "user"
        db.get(UserRecord, ids["deleted"]).is_deleted = True
        db.commit()

    def login(name):
        result = client.post("/api/v1/auth/login", json={"email": f"{name}@example.com", "password": password})
        assert result.status_code == 200, result.text
        return {"Authorization": f"Bearer {result.json()['access_token']}"}, result.cookies.get("refresh_token")

    admin, _ = login("admin")
    member, refresh = login("member")
    path = f"/api/v1/admin/users/{ids['pending']}/approve"
    assert client.put(path).status_code == 401
    assert client.put(path, headers=member).status_code == 403
    assert client.get("/api/v1/admin/pending-approvals", headers=member).status_code == 403
    queue = client.get("/api/v1/admin/pending-approvals", headers=admin).json()
    assert queue["total"] == 1
    assert queue["users"][0]["id"] == ids["pending"]
    assert client.put(path, headers=admin).status_code == 200
    assert client.put(path, headers=admin).status_code == 200
    assert client.get("/api/v1/admin/pending-approvals", headers=admin).json()["total"] == 0
    login("pending")
    assert client.put(f"/api/v1/admin/users/{ids['deleted']}/approve", headers=admin).status_code == 409
    with factory() as db:
        assert db.query(AuditLog).filter_by(action="ADMIN_APPROVE_USER", user_id=ids["pending"]).count() == 1
        db.get(UserRecord, ids["member"]).is_approved = False
        db.commit()
    assert client.get("/api/v1/auth/me", headers=member).status_code == 403
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": refresh}).status_code == 401


def test_approval_preserves_suspension_and_registration_never_grants_admin(approval_app):
    from app.services.security import hash_password
    client, factory, _ = approval_app
    result = client.post("/api/v1/auth/register", json={
        "email": "admin@infinitics.ai", "password": "StrongPassword999!", "full_name": "Public registrant",
    })
    with factory() as db:
        public = db.get(UserRecord, result.json()["user_id"])
        assert public.role == "user" and not public.is_admin and not public.is_approved
        db.add(UserRecord(id="admin", email="reviewer@example.com", hashed_password=hash_password("StrongPassword999!"),
                          is_approved=True, is_admin=True, role="admin"))
        public.is_suspended = True
        public.is_active = False
        db.commit()
    login = client.post("/api/v1/auth/login", json={"email": "reviewer@example.com", "password": "StrongPassword999!"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.put(f"/api/v1/admin/users/{result.json()['user_id']}/approve", headers=headers).status_code == 200
    with factory() as db:
        public = db.get(UserRecord, result.json()["user_id"])
        assert public.is_approved and public.is_suspended and not public.is_active


def test_existing_database_migration_is_idempotent():
    from sqlalchemy import text
    from app.database import migrate_approval
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE users (id TEXT, is_verified BOOLEAN, is_admin BOOLEAN, role TEXT)"))
        conn.execute(text("INSERT INTO users VALUES ('verified', TRUE, FALSE, 'user'), ('pending', FALSE, FALSE, 'user'), ('admin', FALSE, TRUE, 'admin')"))
        migrate_approval(conn)
        assert dict(conn.execute(text("SELECT id, is_approved FROM users")).all()) == {"verified": 1, "pending": 0, "admin": 1}
        conn.execute(text("UPDATE users SET is_approved = FALSE WHERE id = 'verified'"))
        migrate_approval(conn)
        assert conn.execute(text("SELECT is_approved FROM users WHERE id = 'verified'")).scalar() == 0
    engine.dispose()


def test_real_entrypoint_startup_uses_isolated_database(monkeypatch):
    import app.database as database
    from app.main import app
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    factory = sessionmaker(bind=engine)
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", factory)
    with TestClient(app) as client:
        assert client.get("/api/v1/health").status_code == 200
        with factory() as db:
            assert db.query(UserRecord).filter_by(is_admin=True, is_approved=True).count() == 1
    engine.dispose()

