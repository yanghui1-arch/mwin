"""Unit tests for src.api.jwt.verify_at_token

Covers:
  - Valid token returns the correct UUID.
  - Expired token raises HTTPException 401 with "expired" in the detail.
  - Token signed with wrong secret raises HTTPException 401.
  - Completely invalid / non-JWT string raises HTTPException 401.
  - Empty string raises HTTPException 401.
  - Token without 'sub' claim raises (KeyError propagates).
  - Token with a non-UUID 'sub' raises ValueError.
  - Token signed with a different algorithm is rejected.
"""
from __future__ import annotations

import base64
import uuid
from datetime import datetime, timedelta, timezone

import jwt as pyjwt
import pytest
from fastapi import HTTPException

from src.api.jwt import verify_at_token


# The exact secret copied from jwt.py for round-trip test token generation.
_SECRET_B64 = (
    "aitraceinitialsecaitraceinitialsecretaitraceinitialsecretaitrace"
    "initialsecretaitraceinitialsecretaitraceinitialsecretaitraceiniti"
    "alsecretret"
)
_SECRET = base64.b64decode(_SECRET_B64)


def _make_token(
    user_id: uuid.UUID | None = None,
    expires_delta: timedelta = timedelta(hours=1),
    algorithm: str = "HS256",
    secret: bytes = _SECRET,
) -> str:
    if user_id is None:
        user_id = uuid.uuid4()
    exp = datetime.now(tz=timezone.utc) + expires_delta
    payload = {"sub": str(user_id), "exp": exp}
    return pyjwt.encode(payload, secret, algorithm=algorithm)


# ── tests ─────────────────────────────────────────────────────────────────────

class TestVerifyAtToken:
    def test_valid_token_returns_correct_uuid(self):
        uid = uuid.uuid4()
        token = _make_token(user_id=uid)
        result = verify_at_token(at_token=token)
        assert result == uid

    def test_valid_token_returns_uuid_type(self):
        token = _make_token()
        result = verify_at_token(at_token=token)
        assert isinstance(result, uuid.UUID)

    def test_different_users_produce_different_uuids(self):
        uid1 = uuid.uuid4()
        uid2 = uuid.uuid4()
        t1 = _make_token(user_id=uid1)
        t2 = _make_token(user_id=uid2)
        assert verify_at_token(at_token=t1) != verify_at_token(at_token=t2)

    def test_expired_token_raises_401(self):
        token = _make_token(expires_delta=timedelta(seconds=-1))
        with pytest.raises(HTTPException) as exc_info:
            verify_at_token(at_token=token)
        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()

    def test_wrong_secret_raises_401(self):
        wrong_secret = b"wrong-secret-key-that-is-long-enough-for-hmac"
        uid = uuid.uuid4()
        bad_token = _make_token(user_id=uid, secret=wrong_secret)
        with pytest.raises(HTTPException) as exc_info:
            verify_at_token(at_token=bad_token)
        assert exc_info.value.status_code == 401

    def test_completely_invalid_token_raises_401(self):
        with pytest.raises(HTTPException) as exc_info:
            verify_at_token(at_token="not.a.valid.jwt")
        assert exc_info.value.status_code == 401

    def test_empty_string_raises_401(self):
        with pytest.raises(HTTPException) as exc_info:
            verify_at_token(at_token="")
        assert exc_info.value.status_code == 401

    def test_token_without_sub_claim_raises(self):
        """'sub' is missing → payload["sub"] raises KeyError (not caught by the handler)."""
        payload = {
            "user_id": str(uuid.uuid4()),
            "exp": datetime.now(tz=timezone.utc) + timedelta(hours=1),
        }
        token = pyjwt.encode(payload, _SECRET, algorithm="HS256")
        with pytest.raises((HTTPException, KeyError)):
            verify_at_token(at_token=token)

    def test_token_with_non_uuid_sub_raises_value_error(self):
        """'sub' is a valid string but not a UUID → uuid.UUID() raises ValueError."""
        payload = {
            "sub": "not-a-uuid-string",
            "exp": datetime.now(tz=timezone.utc) + timedelta(hours=1),
        }
        token = pyjwt.encode(payload, _SECRET, algorithm="HS256")
        with pytest.raises(ValueError):
            verify_at_token(at_token=token)

    def test_different_algorithm_raises_401(self):
        """Token signed with HS512 instead of HS256 is rejected."""
        uid = uuid.uuid4()
        token = _make_token(user_id=uid, algorithm="HS512")
        with pytest.raises(HTTPException) as exc_info:
            verify_at_token(at_token=token)
        assert exc_info.value.status_code == 401

    def test_token_with_only_whitespace_raises_401(self):
        with pytest.raises(HTTPException) as exc_info:
            verify_at_token(at_token="   ")
        assert exc_info.value.status_code == 401

    def test_just_expired_token_raises_401_not_500(self):
        """Boundary: token expired exactly 1 second ago should still raise 401."""
        token = _make_token(expires_delta=timedelta(seconds=-1))
        with pytest.raises(HTTPException) as exc_info:
            verify_at_token(at_token=token)
        assert exc_info.value.status_code == 401

    def test_token_with_empty_string_sub_raises_value_error(self):
        """'sub' = '' is a valid string but not a UUID → ValueError."""
        payload = {
            "sub": "",
            "exp": datetime.now(tz=timezone.utc) + timedelta(hours=1),
        }
        token = pyjwt.encode(payload, _SECRET, algorithm="HS256")
        with pytest.raises(ValueError):
            verify_at_token(at_token=token)

    def test_garbage_bytes_raise_401(self):
        """Random bytes that look like base64 but decode to nonsense raise 401."""
        with pytest.raises(HTTPException) as exc_info:
            verify_at_token(at_token="aaa.bbb.ccc")
        assert exc_info.value.status_code == 401
