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
            # 1. Seed Plans if not exists
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS plans (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(50) NOT NULL UNIQUE,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                    price_yearly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
                    display_order INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS plan_resources (
                    id SERIAL PRIMARY KEY,
                    plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
                    resource_type VARCHAR(50) NOT NULL,
                    resource_key VARCHAR(100) NOT NULL,
                    limit_value VARCHAR(255) NOT NULL,
                    unit VARCHAR(50),
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_plan_resource UNIQUE (plan_id, resource_key)
                );
                CREATE TABLE IF NOT EXISTS storage_addons (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(50) NOT NULL UNIQUE,
                    name VARCHAR(100) NOT NULL,
                    storage_bytes BIGINT NOT NULL,
                    price_monthly NUMERIC(10, 2) NOT NULL,
                    price_yearly NUMERIC(10, 2) NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    display_order INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS user_subscriptions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
                    status VARCHAR(50) NOT NULL DEFAULT 'active',
                    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
                    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS user_storage_addons (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    addon_id INTEGER NOT NULL REFERENCES storage_addons(id) ON DELETE RESTRICT,
                    status VARCHAR(50) NOT NULL DEFAULT 'active',
                    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS user_consumable_usage (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    period_start TIMESTAMP NOT NULL,
                    period_end TIMESTAMP NOT NULL,
                    credits_used INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_user_consumable_period UNIQUE (user_id, period_start, period_end)
                );
                """
            )

            # Insert default plans if missing
            cursor.execute("SELECT COUNT(*) FROM plans")
            if cursor.fetchone()[0] == 0:
                cursor.execute(
                    """
                    INSERT INTO plans (code, name, description, price_monthly, price_yearly, is_popular, display_order)
                    VALUES
                        ('free', 'Free', 'For trying the platform and personal use', 0.00, 0.00, FALSE, 1),
                        ('pro', 'Pro', 'For creators, freelancers and professionals', 12.00, 120.00, TRUE, 2),
                        ('business', 'Business', 'For teams, studios and scaling organizations', 49.00, 490.00, FALSE, 3);
                    """
                )

            # Insert storage addons if missing
            cursor.execute("SELECT COUNT(*) FROM storage_addons")
            if cursor.fetchone()[0] == 0:
                cursor.execute(
                    """
                    INSERT INTO storage_addons (code, name, storage_bytes, price_monthly, price_yearly, display_order)
                    VALUES
                        ('addon_50gb', '+50 GB Storage', 53687091200, 2.00, 20.00, 1),
                        ('addon_200gb', '+200 GB Storage', 214748364800, 6.00, 60.00, 2),
                        ('addon_500gb', '+500 GB Storage', 536870912000, 10.00, 100.00, 3),
                        ('addon_1tb', '+1 TB Storage', 1099511627776, 15.00, 150.00, 4);
                    """
                )

            # 2. Seed Users
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
                user_id = None

                if existing_user:
                    user_id = existing_user[0]
                    print(
                        f"[Seed] User already exists: "
                        f"{user['email']} (id: {user_id})"
                    )
                else:
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
                        RETURNING id
                        """,
                        (
                            user["email"],
                            password_hash,
                            user["full_name"],
                            user["role"],
                        ),
                    )
                    user_id = cursor.fetchone()[0]
                    print(
                        f"[Seed] Created user: "
                        f"{user['email']} ({user['role']})"
                    )

                # Ensure subscription exists for user
                target_plan_code = "pro" if user["role"] == "admin" else "free"
                cursor.execute("SELECT id FROM plans WHERE code = %s", (target_plan_code,))
                plan_row = cursor.fetchone()
                if plan_row and user_id:
                    cursor.execute(
                        """
                        SELECT id FROM user_subscriptions WHERE user_id = %s
                        """,
                        (user_id,),
                    )
                    if not cursor.fetchone():
                        cursor.execute(
                            """
                            INSERT INTO user_subscriptions (user_id, plan_id, status, started_at)
                            VALUES (%s, %s, 'active', CURRENT_TIMESTAMP)
                            """,
                            (user_id, plan_row[0]),
                        )
                        print(f"[Seed] Assigned {target_plan_code.upper()} plan to user {user['email']}")

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


if __name__ == "__main__":
    print("[Seed] Starting user and catalog seed...")

    wait_for_database()
    seed_users()

    print("[Seed] User and catalog seed completed.")