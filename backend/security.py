
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
import secrets
import hashlib

password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(
    password: str,
    hashed_password: str
) -> bool:
    try:
        return password_hasher.verify(
            hashed_password,
            password
        )
    except (VerifyMismatchError, VerificationError):
        return False


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()
