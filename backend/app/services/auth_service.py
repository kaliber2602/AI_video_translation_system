import os

import psycopg2

from app.core.security import (
    create_access_token,
    create_otp_reset_token,
    create_refresh_token,
    generate_otp,
    get_user_id_from_token,
    hash_password,
    verify_otp_reset_token,
    verify_password,
)

from app.services.email_service import send_email


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ai_video:ai_video@db:5432/ai_video",
)


# =========================================================
# Database
# =========================================================

def get_connection():
    database_url = DATABASE_URL

    if database_url.startswith(
        "postgresql+psycopg://"
    ):
        database_url = database_url.replace(
            "postgresql+psycopg://",
            "postgresql://",
            1,
        )

    if database_url.startswith(
        "postgresql+psycopg2://"
    ):
        database_url = database_url.replace(
            "postgresql+psycopg2://",
            "postgresql://",
            1,
        )

    return psycopg2.connect(database_url)


# =========================================================
# User queries
# =========================================================

def find_user_by_email(email: str):

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    email,
                    password_hash,
                    full_name,
                    avatar_url,
                    role,
                    is_active,
                    created_at,
                    updated_at
                FROM users
                WHERE email = %s
                """,
                (email,),
            )

            return cursor.fetchone()

    finally:
        connection.close()


def find_user_by_id(user_id: int):

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    email,
                    password_hash,
                    full_name,
                    avatar_url,
                    role,
                    is_active,
                    created_at,
                    updated_at
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )

            return cursor.fetchone()

    finally:
        connection.close()


# =========================================================
# Register
# =========================================================

def register_user(
    email: str,
    password: str,
    full_name: str,
):

    if find_user_by_email(email):
        raise ValueError(
            "Email is already registered."
        )

    password_hash = hash_password(password)

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (
                    email,
                    password_hash,
                    full_name,
                    role,
                    is_active,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    'user',
                    TRUE,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                RETURNING
                    id,
                    email,
                    full_name,
                    avatar_url,
                    role,
                    is_active,
                    created_at,
                    updated_at
                """,
                (
                    email,
                    password_hash,
                    full_name,
                ),
            )

            user = cursor.fetchone()

        connection.commit()

        return user

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# =========================================================
# Login
# =========================================================

def authenticate_user(
    email: str,
    password: str,
):

    user = find_user_by_email(email)

    if not user:
        return None

    if not verify_password(
        password,
        user[2],
    ):
        return None

    if not user[6]:
        return None

    return user


def login_user(
    email: str,
    password: str,
):

    user = authenticate_user(
        email,
        password,
    )

    if not user:
        raise ValueError(
            "Invalid email or password."
        )

    user_id = user[0]

    return {
        "access_token": create_access_token(
            user_id
        ),
        "refresh_token": create_refresh_token(
            user_id
        ),
        "token_type": "bearer",
    }


# =========================================================
# Refresh
# =========================================================

def refresh_access_token(
    refresh_token: str,
):

    user_id = get_user_id_from_token(
        refresh_token,
        "refresh",
    )

    user = find_user_by_id(user_id)

    if not user:
        raise ValueError(
            "User not found."
        )

    if not user[6]:
        raise ValueError(
            "User account is inactive."
        )

    return {
        "access_token": create_access_token(
            user_id
        ),
        "token_type": "bearer",
    }


# =========================================================
# Current user
# =========================================================

def get_current_user(user_id: int):

    user = find_user_by_id(user_id)

    if not user:
        raise ValueError(
            "User not found."
        )

    if not user[6]:
        raise ValueError(
            "User account is inactive."
        )

    return user


# =========================================================
# Change password
# =========================================================

def change_password(
    user_id: int,
    current_password: str,
    new_password: str,
):

    user = find_user_by_id(user_id)

    if not user:
        raise ValueError(
            "User not found."
        )

    if not verify_password(
        current_password,
        user[2],
    ):
        raise ValueError(
            "Current password is incorrect."
        )

    new_password_hash = hash_password(
        new_password
    )

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET
                    password_hash = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    new_password_hash,
                    user_id,
                ),
            )

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# =========================================================
# Forgot password
# =========================================================

def request_password_reset(
    email: str,
):

    user = find_user_by_email(email)

    # Không tiết lộ email có tồn tại hay không.
    if not user:
        return

    if not user[6]:
        return

    user_id = user[0]

    otp = generate_otp()

    reset_token = create_otp_reset_token(
        user_id,
        otp,
    )

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body>
        <h2>Password Reset</h2>

        <p>Your verification code is:</p>

        <h1>{otp}</h1>

        <p>
            This code will expire shortly.
        </p>

        <p>
            If you did not request a password reset,
            you can safely ignore this email.
        </p>
    </body>
    </html>
    """

    text_body = (
        f"Your password reset OTP is: {otp}\n"
        "This code will expire shortly."
    )

    send_email(
        to_email=email,
        subject="VIDNOVA Password Reset OTP",
        html_body=html_body,
        text_body=text_body,
    )

    return reset_token


# =========================================================
# Reset password
# =========================================================

def reset_password(
    reset_token: str,
    otp: str,
    new_password: str,
):

    user_id = verify_otp_reset_token(
        reset_token,
        otp,
    )

    user = find_user_by_id(user_id)

    if not user:
        raise ValueError(
            "User not found."
        )

    if not user[6]:
        raise ValueError(
            "User account is inactive."
        )

    new_password_hash = hash_password(
        new_password
    )

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET
                    password_hash = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    new_password_hash,
                    user_id,
                ),
            )

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()