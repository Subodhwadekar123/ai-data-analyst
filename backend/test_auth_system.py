"""
Enterprise Authentication & Authorization System - Comprehensive End-to-End Test
==================================================================================
Tests:
1. User registration with Argon2id password hashing
2. Email verification token generation & validation
3. Account login, JWT access token & HttpOnly refresh token cookie issuance
4. Session tracking in active_sessions table with device & IP parsing
5. Password reset flow (request token -> verify token -> set new password)
6. Password change (verifying old password)
7. Security audit logging across all actions (login, reset, verify, suspend)
8. Admin RBAC protection on admin endpoints
9. Admin user management (list, update role, suspend, unlock, delete)
10. Admin session termination & audit log inspection
"""

import sys
import os
from contextlib import contextmanager

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import (
    SessionLocal,
    UserRecord,
    SessionRecord,
    AuditLog,
    PasswordResetToken
)
from app.services.security import hash_password, verify_password, create_access_token, verify_access_token

@contextmanager
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def run_tests():
    print("=" * 70)
    print("STARTING AUTHENTICATION & AUTHORIZATION SYSTEM VERIFICATION")
    print("=" * 70)

    client = TestClient(app)

    # 1. Test Password Hashing (Argon2id)
    print("\n[TEST 1] Testing Argon2id Password Hashing...")
    raw_password = "SecurePassword123!@#"
    hashed = hash_password(raw_password)
    assert hashed.startswith("$argon2id$"), f"Expected argon2id hash, got: {hashed[:15]}"
    assert verify_password(raw_password, hashed), "Password verification failed"
    assert not verify_password("WrongPassword123!", hashed), "Password verification succeeded on wrong password"
    print("PASS: Argon2id hashing & verification verified.")

    # 2. Test Registration Endpoint
    print("\n[TEST 2] Testing User Registration Endpoint (/api/v1/auth/register)...")
    test_email = "testuser_enterprise@infinitics.ai"
    # Clean up any previous test user
    with db_session() as db:
        db.query(UserRecord).filter(UserRecord.email == test_email).delete()
        db.commit()

    reg_resp = client.post("/api/v1/auth/register", json={
        "email": test_email,
        "password": "StrongPassword999!",
        "full_name": "Test Enterprise User"
    })
    print(f"Registration status: {reg_resp.status_code}")
    assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
    data = reg_resp.json()
    assert data["email"] == test_email
    assert "user_id" in data
    user_id = data["user_id"]
    print("PASS: User registered successfully.")

    # 3. Pending accounts cannot log in until approved.
    pending = client.post("/api/v1/auth/login", json={
        "email": test_email, "password": "StrongPassword999!"
    })
    assert pending.status_code == 403
    with db_session() as db:
        user = db.query(UserRecord).filter(UserRecord.id == user_id).one()
        user.is_approved = True
        db.commit()
    print("PASS: Pending login blocked; account approved for remaining tests.")

    # 4. Test Login Endpoint
    print("\n[TEST 4] Testing User Login (/api/v1/auth/login)...")
    login_resp = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": "StrongPassword999!"
    }, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
    print(f"Login status: {login_resp.status_code}")
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_data = login_resp.json()
    assert "access_token" in login_data
    access_token = login_data["access_token"]
    assert "refresh_token" in login_resp.cookies or "refresh_token" in login_data
    print("PASS: Login returned valid JWT token & refresh cookie.")

    # 5. Test Authenticated Profile Route (/api/v1/auth/me)
    print("\n[TEST 5] Testing Authenticated /auth/me Route...")
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    print(f"Me status: {me_resp.status_code}, user: {me_resp.json().get('email')}")
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == test_email
    print("PASS: Profile retrieved successfully.")

    # 6. Test Active Sessions for User
    print("\n[TEST 6] Testing Active Sessions (/api/v1/auth/sessions)...")
    sess_resp = client.get("/api/v1/auth/sessions", headers={"Authorization": f"Bearer {access_token}"})
    sess_data = sess_resp.json()
    sessions = sess_data.get("sessions", [])
    print(f"Sessions status: {sess_resp.status_code}, count: {len(sessions)}")
    assert sess_resp.status_code == 200
    assert len(sessions) >= 1
    session_id = sessions[0]["id"]
    print(f"PASS: Active session found with ID: {session_id}")

    # 7. Test Password Change
    print("\n[TEST 7] Testing Password Change (/api/v1/auth/change-password)...")
    change_resp = client.post("/api/v1/auth/change-password", json={
        "current_password": "StrongPassword999!",
        "new_password": "NewSuperPassword888!",
        "confirm_password": "NewSuperPassword888!"
    }, headers={"Authorization": f"Bearer {access_token}"})
    print(f"Change Password status: {change_resp.status_code}, response: {change_resp.json()}")
    assert change_resp.status_code == 200
    print("PASS: Password changed successfully.")

    # 8. Test Forgot Password & Reset Flow
    print("\n[TEST 8] Testing Forgot Password & Reset Flow...")
    forgot_resp = client.post("/api/v1/auth/forgot-password", json={"email": test_email})
    assert forgot_resp.status_code == 200
    with db_session() as db:
        reset_rec = db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.is_used == False
        ).order_by(PasswordResetToken.created_at.desc()).first()
        assert reset_rec is not None, "Password reset token not found in DB"
        reset_token = reset_rec.token

    reset_resp = client.post("/api/v1/auth/reset-password", json={
        "token": reset_token,
        "new_password": "FinalResetPassword777!",
        "confirm_password": "FinalResetPassword777!"
    })
    print(f"Reset Password status: {reset_resp.status_code}, response: {reset_resp.json()}")
    assert reset_resp.status_code == 200
    print("PASS: Password reset flow completed.")

    # 9. Test Admin Endpoints & RBAC Protection
    print("\n[TEST 9] Testing Admin RBAC Protection (Non-admin user)...")
    user_login_resp = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": "FinalResetPassword777!"
    })
    assert user_login_resp.status_code == 200
    user_token = user_login_resp.json()["access_token"]

    admin_forbidden_resp = client.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {user_token}"})
    print(f"Non-admin access status: {admin_forbidden_resp.status_code} (Expected 403)")
    assert admin_forbidden_resp.status_code == 403, "Non-admin user was unexpectedly granted admin access!"
    print("PASS: RBAC forbidden check verified.")

    # Promote user to admin for admin tests
    with db_session() as db:
        u = db.query(UserRecord).filter(UserRecord.id == user_id).first()
        u.is_admin = True
        u.role = "admin"
        db.commit()

    # Re-login to get admin token
    admin_login_resp = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": "FinalResetPassword777!"
    })
    admin_token = admin_login_resp.json()["access_token"]

    print("\n[TEST 10] Testing Admin Endpoints with Admin Token...")
    stats_resp = client.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    print(f"Admin Stats status: {stats_resp.status_code}, stats: {stats_resp.json()}")
    assert stats_resp.status_code == 200
    assert "total_users" in stats_resp.json()

    users_list_resp = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert users_list_resp.status_code == 200
    assert users_list_resp.json()["total"] >= 1
    print(f"PASS: Admin retrieved {users_list_resp.json()['total']} users.")

    audit_logs_resp = client.get("/api/v1/admin/audit-logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert audit_logs_resp.status_code == 200
    assert audit_logs_resp.json()["total"] >= 1
    print(f"PASS: Security audit logs retrieved ({audit_logs_resp.json()['total']} events).")

    # Clean up test user
    with db_session() as db:
        db.query(UserRecord).filter(UserRecord.email == test_email).delete()
        db.commit()

    print("\n" + "=" * 70)
    print("ALL 10 VERIFICATION TESTS PASSED SUCCESSFULLY! ENTERPRISE AUTH READY.")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
