import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext


# =========================================================
# Configuration
# =========================================================

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "change-this-secret-key",
)

JWT_ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256",
)

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)

REFRESH_TOKEN_EXPIRE_DAYS = int(
    os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")
)

OTP_EXPIRE_MINUTES = int(
    os.getenv("OTP_EXPIRE_MINUTES", "10")
)


# =========================================================
# Password hashing
# =========================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    password_hash: str,
) -> bool:
    return pwd_context.verify(
        plain_password,
        password_hash,
    )


# =========================================================
# OTP
# =========================================================

def generate_otp() -> str:
    """
    Generate a 6-digit OTP.
    """

    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(otp: str) -> str:
    """
    Hash OTP before putting it into the JWT.
    """

    return hashlib.sha256(
        otp.encode("utf-8")
    ).hexdigest()


def verify_otp(
    otp: str,
    otp_hash: str,
) -> bool:
    """
    Verify user-provided OTP against its hash.
    """

    return secrets.compare_digest(
        hash_otp(otp),
        otp_hash,
    )


# =========================================================
# JWT
# =========================================================

def create_token(
    user_id: int,
    token_type: str,
    expires_delta: timedelta,
    extra_payload: dict | None = None,
) -> str:

    expire = datetime.now(timezone.utc) + expires_delta

    payload = {
        "sub": str(user_id),
        "type": token_type,
        "exp": expire,
    }

    if extra_payload:
        payload.update(extra_payload)

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def create_access_token(user_id: int) -> str:
    return create_token(
        user_id=user_id,
        token_type="access",
        expires_delta=timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    )


def create_refresh_token(user_id: int) -> str:
    return create_token(
        user_id=user_id,
        token_type="refresh",
        expires_delta=timedelta(
            days=REFRESH_TOKEN_EXPIRE_DAYS
        ),
    )


def create_otp_reset_token(
    user_id: int,
    otp: str,
) -> str:

    return create_token(
        user_id=user_id,
        token_type="password_reset",
        expires_delta=timedelta(
            minutes=OTP_EXPIRE_MINUTES
        ),
        extra_payload={
            "otp_hash": hash_otp(otp),
        },
    )


def decode_token(token: str) -> dict:

    try:
        return jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )

    except InvalidTokenError as error:
        raise ValueError(
            "Invalid or expired token."
        ) from error


def get_user_id_from_token(
    token: str,
    token_type: str,
) -> int:

    payload = decode_token(token)

    if payload.get("type") != token_type:
        raise ValueError("Invalid token type.")

    user_id = payload.get("sub")

    if not user_id:
        raise ValueError(
            "Token does not contain user ID."
        )

    try:
        return int(user_id)

    except (TypeError, ValueError) as error:
        raise ValueError(
            "Invalid user ID in token."
        ) from error


def verify_otp_reset_token(
    token: str,
    otp: str,
) -> int:

    payload = decode_token(token)

    if payload.get("type") != "password_reset":
        raise ValueError(
            "Invalid password reset token."
        )

    otp_hash = payload.get("otp_hash")

    if not otp_hash:
        raise ValueError(
            "OTP information is missing."
        )

    if not verify_otp(otp, otp_hash):
        raise ValueError("Invalid OTP.")

    user_id = payload.get("sub")

    if not user_id:
        raise ValueError(
            "Token does not contain user ID."
        )

    try:
        return int(user_id)

    except (TypeError, ValueError) as error:
        raise ValueError(
            "Invalid user ID in token."
        ) from error