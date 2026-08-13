import os
import time

import psycopg2
from passlib.context import CryptContext


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ai_video:ai_video@db:5432/ai_video",
)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


SEED_USERS = [
    {
        "email": "admin@vidnova.com",
        "password": "Admin@123456",
        "full_name": "VIDNOVA Administrator",
        "role": "admin",
    },
    {
        "email": "user@vidnova.com",
        "password": "User@123456",
        "full_name": "Demo User",
        "role": "user",
    },
]


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def wait_for_database(max_retries=30, delay=2):
    for attempt in range(1, max_retries + 1):
        try:
            connection = get_connection()
            connection.close()

            print("[Seed] PostgreSQL is ready.")
            return

        except psycopg2.OperationalError as error:
            print(
                f"[Seed] PostgreSQL not ready "
                f"(attempt {attempt}/{max_retries}): {error}"
            )

            if attempt == max_retries:
                raise

            time.sleep(delay)


def seed_users():
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            for user in SEED_USERS:
                cursor.execute(
                    """
                    SELECT id
                    FROM users
                    WHERE email = %s
                    """,
                    (user["email"],),
                )

                existing_user = cursor.fetchone()

                if existing_user:
                    print(
                        f"[Seed] User already exists: "
                        f"{user['email']}"
                    )
                    continue

                password_hash = pwd_context.hash(user["password"])

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
                        %s,
                        TRUE,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    """,
                    (
                        user["email"],
                        password_hash,
                        user["full_name"],
                        user["role"],
                    ),
                )

                print(
                    f"[Seed] Created user: "
                    f"{user['email']} ({user['role']})"
                )

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


if __name__ == "__main__":
    print("[Seed] Starting user seed...")

    wait_for_database()
    seed_users()

    print("[Seed] User seed completed.")