import base64
import hashlib
import io
import os
import secrets
import uuid

from datetime import datetime, timezone
import psycopg2

from app.core.database import get_connection
from app.core.security import (
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    create_otp_reset_token,
    create_refresh_token,
    generate_otp,
    get_refresh_token_user_id,
    hash_password,
    verify_otp_reset_token,
    verify_password,
)

from app.services.email_service import send_email


# =========================================================
# Refresh Token Helpers
# =========================================================

def hash_refresh_token(
    refresh_token: str,
) -> str:

    return hashlib.sha256(
        refresh_token.encode("utf-8")
    ).hexdigest()


# =========================================================
# User Queries
# =========================================================

def find_user_by_email(
    email: str,
):

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
                    avatar,
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


def find_user_by_id(
    user_id: int,
):

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
                    avatar,
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

    password_hash = hash_password(
        password
    )

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
                    avatar,
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
# Authentication
# =========================================================

def authenticate_user(
    email: str,
    password: str,
):

    user = find_user_by_email(
        email
    )

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


# =========================================================
# Login
# =========================================================

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

    access_token = create_access_token(
        user_id
    )

    refresh_token = create_refresh_token(
        user_id
    )

    refresh_token_hash = hash_refresh_token(
        refresh_token
    )

    refresh_token_id = str(uuid.uuid4())

    connection = get_connection()

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO refresh_tokens (
                    id,
                    user_id,
                    token_hash,
                    expires_at,
                    created_at
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    CURRENT_TIMESTAMP
                        + (%s * INTERVAL '1 day'),
                    CURRENT_TIMESTAMP
                )
                """,
                (
                    refresh_token_id,
                    user_id,
                    refresh_token_hash,
                    REFRESH_TOKEN_EXPIRE_DAYS,
                ),
            )

        connection.commit()

    except Exception:

        connection.rollback()
        raise

    finally:

        connection.close()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# =========================================================
# Refresh Token
# =========================================================

def refresh_access_token(
    refresh_token: str,
):

    user_id = get_refresh_token_user_id(
        refresh_token
    )

    old_refresh_token_hash = hash_refresh_token(
        refresh_token
    )


    connection = get_connection()

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    user_id,
                    token_hash,
                    expires_at,
                    revoked_at
                FROM refresh_tokens
                WHERE user_id = %s
                  AND token_hash = %s
                FOR UPDATE
                """,
                (
                    user_id,
                    old_refresh_token_hash,
                ),
            )

            stored_token = cursor.fetchone()

            if not stored_token:

                raise ValueError(
                    "Invalid refresh token."
                )

            token_id = stored_token[0]
            stored_user_id = stored_token[1]
            stored_hash = stored_token[2]
            expires_at = stored_token[3]
            revoked_at = stored_token[4]

            if stored_user_id != user_id:

                raise ValueError(
                    "Invalid refresh token."
                )

            if revoked_at is not None:

                raise ValueError(
                    "Refresh token has been revoked."
                )

            now = datetime.now(
                timezone.utc
            )

            if expires_at <= now:

                raise ValueError(
                    "Refresh token has expired."
                )

            if not secrets.compare_digest(
                stored_hash,
                old_refresh_token_hash,
            ):

                raise ValueError(
                    "Invalid refresh token."
                )

            user = find_user_by_id(
                user_id
            )

            if not user:

                raise ValueError(
                    "User not found."
                )

            if not user[6]:

                raise ValueError(
                    "User account is inactive."
                )

            new_access_token = create_access_token(
                user_id
            )

            new_refresh_token = create_refresh_token(
                user_id
            )

            new_refresh_token_hash = (
                hash_refresh_token(
                    new_refresh_token
                )
            )

            cursor.execute(
                """
                UPDATE refresh_tokens
                SET
                    revoked_at = CURRENT_TIMESTAMP
                WHERE id = %s
                  AND revoked_at IS NULL
                """,
                (token_id,),
            )

            new_refresh_token_id = str(uuid.uuid4())

            cursor.execute(
                """
                INSERT INTO refresh_tokens (
                    id,
                    user_id,
                    token_hash,
                    expires_at,
                    created_at
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    CURRENT_TIMESTAMP
                        + (%s * INTERVAL '1 day'),
                    CURRENT_TIMESTAMP
                )
                """,
                (
                    new_refresh_token_id,
                    user_id,
                    new_refresh_token_hash,
                    REFRESH_TOKEN_EXPIRE_DAYS,
                ),
            )

        connection.commit()

    except Exception:

        connection.rollback()
        raise

    finally:

        connection.close()

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


# =========================================================
# Logout
# =========================================================

def logout_user(
    refresh_token: str,
):

    user_id = get_refresh_token_user_id(
        refresh_token
    )

    refresh_token_hash = hash_refresh_token(
        refresh_token
    )

    connection = get_connection()

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    token_hash,
                    revoked_at,
                    expires_at
                FROM refresh_tokens
                WHERE user_id = %s
                  AND token_hash = %s
                """,
                (
                    user_id,
                    refresh_token_hash,
                ),
            )

            stored_token = cursor.fetchone()

            if not stored_token:

                raise ValueError(
                    "Invalid refresh token."
                )

            token_id = stored_token[0]
            stored_hash = stored_token[1]
            revoked_at = stored_token[2]

            if revoked_at is not None:

                return

            if not secrets.compare_digest(
                stored_hash,
                refresh_token_hash,
            ):

                raise ValueError(
                    "Invalid refresh token."
                )

            cursor.execute(
                """
                UPDATE refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE id = %s
                  AND revoked_at IS NULL
                """,
                (token_id,),
            )

        connection.commit()

    except Exception:

        connection.rollback()
        raise

    finally:

        connection.close()


# =========================================================
# Logout All
# =========================================================

def logout_all_user_tokens(
    user_id: int,
):

    connection = get_connection()

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                  AND revoked_at IS NULL
                """,
                (user_id,),
            )

        connection.commit()

    except Exception:

        connection.rollback()
        raise

    finally:

        connection.close()


# =========================================================
# Current User
# =========================================================

def get_current_user(
    user_id: int,
):

    user = find_user_by_id(
        user_id
    )

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
# Change Password
# =========================================================

def change_password(
    user_id: int,
    current_password: str,
    new_password: str,
):

    user = find_user_by_id(
        user_id
    )

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

            cursor.execute(
                """
                UPDATE refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                  AND revoked_at IS NULL
                """,
                (user_id,),
            )

        connection.commit()

    except Exception:

        connection.rollback()
        raise

    finally:

        connection.close()


# =========================================================
# Forgot Password
# =========================================================

def request_password_reset(
    email: str,
):

    user = find_user_by_email(
        email
    )

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
# Reset Password
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

    user = find_user_by_id(
        user_id
    )

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

            cursor.execute(
                """
                UPDATE refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                  AND revoked_at IS NULL
                """,
                (user_id,),
            )

        connection.commit()

    except Exception:

        connection.rollback()
        raise

    finally:

        connection.close()
        
# =========================================================
# Update Avatar
# =========================================================

import base64
import io
import logging

from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)


MAX_AVATAR_SIZE = 2 * 1024 * 1024
MAX_AVATAR_DIMENSION = 512
MAX_AVATAR_INPUT_DIMENSION = 4096
AVATAR_QUALITY = 85


async def update_user_avatar(
    user_id: int,
    avatar_file,
):
    # -----------------------------------------------------
    # Validate file
    # -----------------------------------------------------

    if not avatar_file:
        raise ValueError(
            "Avatar file is required."
        )

    allowed_content_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    if avatar_file.content_type not in allowed_content_types:
        raise ValueError(
            "Avatar must be a JPEG, PNG, or WebP image."
        )

    logger.info(
        "[AVATAR] Upload started | user_id=%s | filename=%s | content_type=%s",
        user_id,
        avatar_file.filename,
        avatar_file.content_type,
    )

    # -----------------------------------------------------
    # Read file
    # -----------------------------------------------------

    try:
        image_bytes = await avatar_file.read()

    except Exception as exc:
        logger.exception(
            "[AVATAR] Failed to read uploaded file | user_id=%s",
            user_id,
        )

        raise ValueError(
            "Unable to read avatar file."
        ) from exc

    if not image_bytes:
        raise ValueError(
            "Avatar file is empty."
        )

    if len(image_bytes) > MAX_AVATAR_SIZE:
        raise ValueError(
            "Avatar file must not exceed 2 MB."
        )

    logger.info(
        "[AVATAR] File read successfully | user_id=%s | size=%d bytes",
        user_id,
        len(image_bytes),
    )

    # -----------------------------------------------------
    # Verify image
    # -----------------------------------------------------

    try:
        image = Image.open(
            io.BytesIO(image_bytes)
        )

        image.verify()

    except (
        UnidentifiedImageError,
        OSError,
    ) as exc:

        logger.warning(
            "[AVATAR] Invalid image | user_id=%s | filename=%s",
            user_id,
            avatar_file.filename,
        )

        raise ValueError(
            "Invalid image file."
        ) from exc

    # -----------------------------------------------------
    # Re-open image after verify()
    # -----------------------------------------------------

    try:
        image = Image.open(
            io.BytesIO(image_bytes)
        )

        image.load()

    except (
        UnidentifiedImageError,
        OSError,
    ) as exc:

        logger.warning(
            "[AVATAR] Unable to process image | user_id=%s",
            user_id,
        )

        raise ValueError(
            "Unable to process image file."
        ) from exc

    # -----------------------------------------------------
    # Validate dimensions
    # -----------------------------------------------------

    if image.width <= 0 or image.height <= 0:
        raise ValueError(
            "Invalid image dimensions."
        )

    if (
        image.width > MAX_AVATAR_INPUT_DIMENSION
        or image.height > MAX_AVATAR_INPUT_DIMENSION
    ):
        raise ValueError(
            "Avatar dimensions must not exceed 4096x4096 pixels."
        )

    logger.info(
        "[AVATAR] Image validated | user_id=%s | size=%sx%s | mode=%s",
        user_id,
        image.width,
        image.height,
        image.mode,
    )

    # -----------------------------------------------------
    # Handle transparency
    # -----------------------------------------------------

    if image.mode in ("RGBA", "LA"):

        background = Image.new(
            "RGB",
            image.size,
            (255, 255, 255),
        )

        alpha = image.getchannel("A")

        background.paste(
            image,
            mask=alpha,
        )

        image = background

    elif image.mode != "RGB":

        image = image.convert("RGB")

    # -----------------------------------------------------
    # Resize
    # -----------------------------------------------------

    image.thumbnail(
        (
            MAX_AVATAR_DIMENSION,
            MAX_AVATAR_DIMENSION,
        ),
        Image.Resampling.LANCZOS,
    )

    logger.info(
        "[AVATAR] Image resized | user_id=%s | size=%sx%s",
        user_id,
        image.width,
        image.height,
    )

    # -----------------------------------------------------
    # Convert to JPEG
    # -----------------------------------------------------

    output = io.BytesIO()

    try:

        image.save(
            output,
            format="JPEG",
            quality=AVATAR_QUALITY,
            optimize=True,
        )

    except Exception as exc:

        logger.exception(
            "[AVATAR] Failed to encode image | user_id=%s",
            user_id,
        )

        raise ValueError(
            "Failed to process avatar image."
        ) from exc

    processed_image = output.getvalue()

    if not processed_image:
        raise ValueError(
            "Processed avatar image is empty."
        )

    # -----------------------------------------------------
    # Base64
    # -----------------------------------------------------

    avatar_base64 = base64.b64encode(
        processed_image
    ).decode("ascii")

    logger.info(
        "[AVATAR] Image encoded | user_id=%s | jpeg_size=%d bytes | base64_size=%d chars",
        user_id,
        len(processed_image),
        len(avatar_base64),
    )

    # -----------------------------------------------------
    # Update database
    # -----------------------------------------------------

    connection = None

    try:

        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE users
                SET
                    avatar = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING
                    id,
                    email,
                    password_hash,
                    full_name,
                    avatar,
                    role,
                    is_active,
                    created_at,
                    updated_at
                """,
                (
                    avatar_base64,
                    user_id,
                ),
            )

            user = cursor.fetchone()

            if not user:
                raise ValueError(
                    "User not found."
                )

        connection.commit()

        logger.info(
            "[AVATAR] Database updated successfully | user_id=%s",
            user_id,
        )

        return user

    except ValueError:
        if connection:
            connection.rollback()
        raise

    except Exception as exc:

        if connection:
            connection.rollback()

        # QUAN TRỌNG:
        # In lỗi database thật ra backend console
        logger.exception(
            "[AVATAR] Database update failed | user_id=%s",
            user_id,
        )

        raise RuntimeError(
            f"Failed to save avatar to database: {exc}"
        ) from exc

    finally:

        if connection:
            connection.close()