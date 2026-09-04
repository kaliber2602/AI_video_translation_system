import os
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from fastapi import HTTPException, status
import psycopg2

from app.core.database import get_connection
from app.core.config import UPLOAD_DIR, OUTPUT_DIR

logger = logging.getLogger(__name__)

# =========================================================
# Default Fallback Plan & Addons (if DB not yet seeded or offline)
# =========================================================

DEFAULT_PLANS_SEED = [
    {
        "id": 1,
        "code": "free",
        "name": "Free",
        "description": "For trying the platform and personal use",
        "price_monthly": 0.0,
        "price_yearly": 0.0,
        "billing_cycle": "monthly",
        "is_active": True,
        "is_popular": False,
        "display_order": 1,
        "resources": [
            {"id": 1, "plan_id": 1, "resource_type": "STORAGE", "resource_key": "storage_bytes", "limit_value": "5368709120", "unit": "bytes"},
            {"id": 2, "plan_id": 1, "resource_type": "CONSUMABLE", "resource_key": "ai_credits_monthly", "limit_value": "1000", "unit": "credits"},
            {"id": 3, "plan_id": 1, "resource_type": "LIMIT", "resource_key": "max_file_size_bytes", "limit_value": "524288000", "unit": "bytes"},
            {"id": 4, "plan_id": 1, "resource_type": "LIMIT", "resource_key": "max_video_duration_seconds", "limit_value": "1800", "unit": "seconds"},
            {"id": 5, "plan_id": 1, "resource_type": "LIMIT", "resource_key": "max_upload_resolution", "limit_value": "1080p", "unit": "resolution"},
            {"id": 6, "plan_id": 1, "resource_type": "LIMIT", "resource_key": "max_processing_resolution", "limit_value": "720p", "unit": "resolution"},
            {"id": 7, "plan_id": 1, "resource_type": "LIMIT", "resource_key": "max_streaming_resolution", "limit_value": "720p", "unit": "resolution"},
            {"id": 8, "plan_id": 1, "resource_type": "LIMIT", "resource_key": "max_export_resolution", "limit_value": "720p", "unit": "resolution"},
            {"id": 9, "plan_id": 1, "resource_type": "LIMIT", "resource_key": "max_concurrent_jobs", "limit_value": "1", "unit": "count"},
            {"id": 10, "plan_id": 1, "resource_type": "LIMIT", "resource_key": "max_projects", "limit_value": "5", "unit": "count"},
            {"id": 11, "plan_id": 1, "resource_type": "FEATURE", "resource_key": "ai_translation", "limit_value": "true", "unit": "boolean"},
            {"id": 12, "plan_id": 1, "resource_type": "FEATURE", "resource_key": "text_to_speech", "limit_value": "true", "unit": "boolean"},
            {"id": 13, "plan_id": 1, "resource_type": "FEATURE", "resource_key": "speaker_diarization", "limit_value": "true", "unit": "boolean"},
            {"id": 14, "plan_id": 1, "resource_type": "FEATURE", "resource_key": "hls_streaming", "limit_value": "true", "unit": "boolean"},
            {"id": 15, "plan_id": 1, "resource_type": "FEATURE", "resource_key": "video_editor", "limit_value": "true", "unit": "boolean"},
            {"id": 16, "plan_id": 1, "resource_type": "FEATURE", "resource_key": "document_export", "limit_value": "true", "unit": "boolean"},
            {"id": 17, "plan_id": 1, "resource_type": "FEATURE", "resource_key": "smart_subtitles", "limit_value": "true", "unit": "boolean"},
            {"id": 18, "plan_id": 1, "resource_type": "FEATURE", "resource_key": "batch_processing", "limit_value": "true", "unit": "boolean"},
            {"id": 19, "plan_id": 1, "resource_type": "FEATURE", "resource_key": "api_access", "limit_value": "true", "unit": "boolean"},
            {"id": 20, "plan_id": 1, "resource_type": "FEATURE", "resource_key": "priority_processing", "limit_value": "true", "unit": "boolean"},
            {"id": 21, "plan_id": 1, "resource_type": "FEATURE", "resource_key": "team_workspace", "limit_value": "true", "unit": "boolean"},
        ],
    },
    {
        "id": 2,
        "code": "pro",
        "name": "Pro",
        "description": "For creators, freelancers and professionals",
        "price_monthly": 12.0,
        "price_yearly": 120.0,
        "billing_cycle": "monthly",
        "is_active": True,
        "is_popular": True,
        "display_order": 2,
        "resources": [
            {"id": 22, "plan_id": 2, "resource_type": "STORAGE", "resource_key": "storage_bytes", "limit_value": "107374182400", "unit": "bytes"},
            {"id": 23, "plan_id": 2, "resource_type": "CONSUMABLE", "resource_key": "ai_credits_monthly", "limit_value": "10000", "unit": "credits"},
            {"id": 24, "plan_id": 2, "resource_type": "LIMIT", "resource_key": "max_file_size_bytes", "limit_value": "5368709120", "unit": "bytes"},
            {"id": 25, "plan_id": 2, "resource_type": "LIMIT", "resource_key": "max_video_duration_seconds", "limit_value": "14400", "unit": "seconds"},
            {"id": 26, "plan_id": 2, "resource_type": "LIMIT", "resource_key": "max_upload_resolution", "limit_value": "4K", "unit": "resolution"},
            {"id": 27, "plan_id": 2, "resource_type": "LIMIT", "resource_key": "max_processing_resolution", "limit_value": "1080p", "unit": "resolution"},
            {"id": 28, "plan_id": 2, "resource_type": "LIMIT", "resource_key": "max_streaming_resolution", "limit_value": "1080p", "unit": "resolution"},
            {"id": 29, "plan_id": 2, "resource_type": "LIMIT", "resource_key": "max_export_resolution", "limit_value": "1080p", "unit": "resolution"},
            {"id": 30, "plan_id": 2, "resource_type": "LIMIT", "resource_key": "max_concurrent_jobs", "limit_value": "3", "unit": "count"},
            {"id": 31, "plan_id": 2, "resource_type": "LIMIT", "resource_key": "max_projects", "limit_value": "50", "unit": "count"},
            {"id": 32, "plan_id": 2, "resource_type": "FEATURE", "resource_key": "ai_translation", "limit_value": "true", "unit": "boolean"},
            {"id": 33, "plan_id": 2, "resource_type": "FEATURE", "resource_key": "text_to_speech", "limit_value": "true", "unit": "boolean"},
            {"id": 34, "plan_id": 2, "resource_type": "FEATURE", "resource_key": "speaker_diarization", "limit_value": "true", "unit": "boolean"},
            {"id": 35, "plan_id": 2, "resource_type": "FEATURE", "resource_key": "hls_streaming", "limit_value": "true", "unit": "boolean"},
            {"id": 36, "plan_id": 2, "resource_type": "FEATURE", "resource_key": "video_editor", "limit_value": "true", "unit": "boolean"},
            {"id": 37, "plan_id": 2, "resource_type": "FEATURE", "resource_key": "document_export", "limit_value": "true", "unit": "boolean"},
            {"id": 38, "plan_id": 2, "resource_type": "FEATURE", "resource_key": "smart_subtitles", "limit_value": "true", "unit": "boolean"},
            {"id": 39, "plan_id": 2, "resource_type": "FEATURE", "resource_key": "batch_processing", "limit_value": "true", "unit": "boolean"},
            {"id": 40, "plan_id": 2, "resource_type": "FEATURE", "resource_key": "api_access", "limit_value": "true", "unit": "boolean"},
            {"id": 41, "plan_id": 2, "resource_type": "FEATURE", "resource_key": "priority_processing", "limit_value": "true", "unit": "boolean"},
            {"id": 42, "plan_id": 2, "resource_type": "FEATURE", "resource_key": "team_workspace", "limit_value": "true", "unit": "boolean"},
        ],
    },
    {
        "id": 3,
        "code": "business",
        "name": "Business",
        "description": "For teams, studios and scaling organizations",
        "price_monthly": 49.0,
        "price_yearly": 490.0,
        "billing_cycle": "monthly",
        "is_active": True,
        "is_popular": False,
        "display_order": 3,
        "resources": [
            {"id": 43, "plan_id": 3, "resource_type": "STORAGE", "resource_key": "storage_bytes", "limit_value": "1099511627776", "unit": "bytes"},
            {"id": 44, "plan_id": 3, "resource_type": "CONSUMABLE", "resource_key": "ai_credits_monthly", "limit_value": "100000", "unit": "credits"},
            {"id": 45, "plan_id": 3, "resource_type": "LIMIT", "resource_key": "max_file_size_bytes", "limit_value": "21474836480", "unit": "bytes"},
            {"id": 46, "plan_id": 3, "resource_type": "LIMIT", "resource_key": "max_video_duration_seconds", "limit_value": "43200", "unit": "seconds"},
            {"id": 47, "plan_id": 3, "resource_type": "LIMIT", "resource_key": "max_upload_resolution", "limit_value": "4K", "unit": "resolution"},
            {"id": 48, "plan_id": 3, "resource_type": "LIMIT", "resource_key": "max_processing_resolution", "limit_value": "4K", "unit": "resolution"},
            {"id": 49, "plan_id": 3, "resource_type": "LIMIT", "resource_key": "max_streaming_resolution", "limit_value": "4K", "unit": "resolution"},
            {"id": 50, "plan_id": 3, "resource_type": "LIMIT", "resource_key": "max_export_resolution", "limit_value": "4K", "unit": "resolution"},
            {"id": 51, "plan_id": 3, "resource_type": "LIMIT", "resource_key": "max_concurrent_jobs", "limit_value": "10", "unit": "count"},
            {"id": 52, "plan_id": 3, "resource_type": "LIMIT", "resource_key": "max_projects", "limit_value": "500", "unit": "count"},
            {"id": 53, "plan_id": 3, "resource_type": "FEATURE", "resource_key": "ai_translation", "limit_value": "true", "unit": "boolean"},
            {"id": 54, "plan_id": 3, "resource_type": "FEATURE", "resource_key": "text_to_speech", "limit_value": "true", "unit": "boolean"},
            {"id": 55, "plan_id": 3, "resource_type": "FEATURE", "resource_key": "speaker_diarization", "limit_value": "true", "unit": "boolean"},
            {"id": 56, "plan_id": 3, "resource_type": "FEATURE", "resource_key": "hls_streaming", "limit_value": "true", "unit": "boolean"},
            {"id": 57, "plan_id": 3, "resource_type": "FEATURE", "resource_key": "video_editor", "limit_value": "true", "unit": "boolean"},
            {"id": 58, "plan_id": 3, "resource_type": "FEATURE", "resource_key": "document_export", "limit_value": "true", "unit": "boolean"},
            {"id": 59, "plan_id": 3, "resource_type": "FEATURE", "resource_key": "smart_subtitles", "limit_value": "true", "unit": "boolean"},
            {"id": 60, "plan_id": 3, "resource_type": "FEATURE", "resource_key": "batch_processing", "limit_value": "true", "unit": "boolean"},
            {"id": 61, "plan_id": 3, "resource_type": "FEATURE", "resource_key": "api_access", "limit_value": "true", "unit": "boolean"},
            {"id": 62, "plan_id": 3, "resource_type": "FEATURE", "resource_key": "priority_processing", "limit_value": "true", "unit": "boolean"},
            {"id": 63, "plan_id": 3, "resource_type": "FEATURE", "resource_key": "team_workspace", "limit_value": "true", "unit": "boolean"},
        ],
    },
]

DEFAULT_ADDONS_SEED = [
    {"id": 1, "code": "addon_50gb", "name": "+50 GB Storage", "storage_bytes": 53687091200, "storage_gb": 50.0, "price_monthly": 2.0, "price_yearly": 20.0, "is_active": True, "display_order": 1},
    {"id": 2, "code": "addon_200gb", "name": "+200 GB Storage", "storage_bytes": 214748364800, "storage_gb": 200.0, "price_monthly": 6.0, "price_yearly": 60.0, "is_active": True, "display_order": 2},
    {"id": 3, "code": "addon_500gb", "name": "+500 GB Storage", "storage_bytes": 536870912000, "storage_gb": 500.0, "price_monthly": 10.0, "price_yearly": 100.0, "is_active": True, "display_order": 3},
    {"id": 4, "code": "addon_1tb", "name": "+1 TB Storage", "storage_bytes": 1099511627776, "storage_gb": 1000.0, "price_monthly": 15.0, "price_yearly": 150.0, "is_active": True, "display_order": 4},
]


# =========================================================
# Ensure Tables Exist (Migration / Schema Helper)
# =========================================================

def ensure_subscription_tables_exist(connection=None):
    """
    Creates subscription tables and seeds default catalog if not already present.
    """
    should_close = False
    if connection is None:
        try:
            connection = get_connection()
            should_close = True
        except Exception as e:
            logger.debug(f"[SubscriptionService] Database connection bypassed in fallback: {e}")
            return

    try:
        with connection.cursor() as cursor:
            # 1. Plans table
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
                """
            )

            # 2. Plan resources
            cursor.execute(
                """
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
                """
            )

            # 3. Storage add-ons
            cursor.execute(
                """
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
                """
            )

            # 4. User subscriptions
            cursor.execute(
                """
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
                """
            )

            # 5. User storage add-ons
            cursor.execute(
                """
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
                """
            )

            # 6. User consumable usage
            cursor.execute(
                """
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

            # 7. Credit audit logs
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS credit_audit_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    video_id INTEGER,
                    job_id UUID,
                    service_type VARCHAR(50) NOT NULL,
                    credits_deducted INTEGER NOT NULL,
                    balance_after INTEGER,
                    description TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )

            # 8. Payment transactions
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS payment_transactions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    transaction_code VARCHAR(100) NOT NULL UNIQUE,
                    amount NUMERIC(10, 2) NOT NULL,
                    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
                    payment_method VARCHAR(50) NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    metadata JSONB,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )

            # Seed Plans & Resources if table is empty
            cursor.execute("SELECT COUNT(*) FROM plans")
            count = cursor.fetchone()[0]
            if count == 0:
                for plan in DEFAULT_PLANS_SEED:
                    cursor.execute(
                        """
                        INSERT INTO plans (code, name, description, price_monthly, price_yearly, is_popular, display_order)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (
                            plan["code"],
                            plan["name"],
                            plan["description"],
                            plan["price_monthly"],
                            plan["price_yearly"],
                            plan["is_popular"],
                            plan["display_order"],
                        ),
                    )
                    plan_id = cursor.fetchone()[0]

                    for res in plan["resources"]:
                        cursor.execute(
                            """
                            INSERT INTO plan_resources (plan_id, resource_type, resource_key, limit_value, unit)
                            VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT (plan_id, resource_key) DO UPDATE
                            SET limit_value = EXCLUDED.limit_value
                            """,
                            (
                                plan_id,
                                res["resource_type"],
                                res["resource_key"],
                                res["limit_value"],
                                res["unit"],
                            ),
                        )

            # Seed Storage Add-ons if table is empty
            cursor.execute("SELECT COUNT(*) FROM storage_addons")
            if cursor.fetchone()[0] == 0:
                for addon in DEFAULT_ADDONS_SEED:
                    cursor.execute(
                        """
                        INSERT INTO storage_addons (code, name, storage_bytes, price_monthly, price_yearly, display_order)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (code) DO NOTHING
                        """,
                        (
                            addon["code"],
                            addon["name"],
                            addon["storage_bytes"],
                            addon["price_monthly"],
                            addon["price_yearly"],
                            addon["display_order"],
                        ),
                    )

        connection.commit()
    except Exception as e:
        if connection:
            connection.rollback()
        logger.debug(f"[SubscriptionService] Ensure tables notice: {e}")
    finally:
        if should_close and connection:
            connection.close()


# =========================================================
# Query Active Plans & Catalog
# =========================================================

def get_active_plans() -> List[Dict[str, Any]]:
    """
    Returns all active plans with grouped categorized resources.
    """
    try:
        ensure_subscription_tables_exist()
        connection = get_connection()
    except Exception:
        return DEFAULT_PLANS_SEED

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, code, name, description, price_monthly, price_yearly, billing_cycle, is_active, is_popular, display_order
                FROM plans
                WHERE is_active = TRUE
                ORDER BY display_order ASC, id ASC
                """
            )
            plan_rows = cursor.fetchall()
            if not plan_rows:
                return DEFAULT_PLANS_SEED

            plan_ids = [r[0] for r in plan_rows]
            cursor.execute(
                """
                SELECT id, plan_id, resource_type, resource_key, limit_value, unit
                FROM plan_resources
                WHERE plan_id = ANY(%s)
                ORDER BY id ASC
                """,
                (plan_ids,),
            )
            resource_rows = cursor.fetchall()

            resources_by_plan: Dict[int, List[Dict[str, Any]]] = {pid: [] for pid in plan_ids}
            for rr in resource_rows:
                resources_by_plan[rr[1]].append(
                    {
                        "id": rr[0],
                        "plan_id": rr[1],
                        "resource_type": rr[2],
                        "resource_key": rr[3],
                        "limit_value": rr[4],
                        "unit": rr[5],
                    }
                )

            result = []
            for r in plan_rows:
                pid = r[0]
                result.append(
                    {
                        "id": r[0],
                        "code": r[1],
                        "name": r[2],
                        "description": r[3],
                        "price_monthly": float(r[4]),
                        "price_yearly": float(r[5]),
                        "billing_cycle": r[6],
                        "is_active": r[7],
                        "is_popular": r[8],
                        "display_order": r[9],
                        "resources": resources_by_plan.get(pid, []),
                    }
                )
            return result
    except Exception as e:
        logger.warning(f"[SubscriptionService] get_active_plans error, returning fallback: {e}")
        return DEFAULT_PLANS_SEED
    finally:
        connection.close()


def get_plan_by_id_or_code(plan_id_or_code: Union[int, str]) -> Optional[Dict[str, Any]]:
    """
    Finds a single plan by its ID or code with all resources.
    """
    plans = get_active_plans()
    if isinstance(plan_id_or_code, int) or (isinstance(plan_id_or_code, str) and plan_id_or_code.isdigit()):
        pid = int(plan_id_or_code)
        return next((p for p in plans if p.get("id") == pid), None)
    return next((p for p in plans if p.get("code") == str(plan_id_or_code).lower()), None)


def get_storage_addons() -> List[Dict[str, Any]]:
    """
    Returns all active storage add-ons.
    """
    try:
        ensure_subscription_tables_exist()
        connection = get_connection()
    except Exception:
        return DEFAULT_ADDONS_SEED

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, code, name, storage_bytes, price_monthly, price_yearly, is_active, display_order
                FROM storage_addons
                WHERE is_active = TRUE
                ORDER BY display_order ASC, storage_bytes ASC
                """
            )
            rows = cursor.fetchall()
            if not rows:
                return DEFAULT_ADDONS_SEED

            return [
                {
                    "id": r[0],
                    "code": r[1],
                    "name": r[2],
                    "storage_bytes": int(r[3]),
                    "storage_gb": round(int(r[3]) / (1024**3), 1),
                    "price_monthly": float(r[4]),
                    "price_yearly": float(r[5]),
                    "is_active": r[6],
                    "display_order": r[7],
                }
                for r in rows
            ]
    except Exception as e:
        logger.warning(f"[SubscriptionService] get_storage_addons error, returning fallback: {e}")
        return DEFAULT_ADDONS_SEED
    finally:
        connection.close()


def get_storage_addon_by_id(addon_id: int) -> Optional[Dict[str, Any]]:
    """
    Finds a single storage add-on by ID.
    """
    addons = get_storage_addons()
    return next((a for a in addons if a.get("id") == addon_id), None)


def get_pricing_catalog() -> Dict[str, Any]:
    """
    Returns the full pricing catalog (plans + storage add-ons).
    """
    return {
        "plans": get_active_plans(),
        "storage_addons": get_storage_addons(),
    }


# =========================================================
# User Subscription & Effective Quota
# =========================================================

def get_user_active_subscription(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Finds the active subscription of the user or falls back to 'free' plan safely.
    """
    try:
        ensure_subscription_tables_exist()
        connection = get_connection()
    except Exception:
        # Fallback Free Subscription
        return {
            "id": 1,
            "user_id": user_id,
            "plan_id": 1,
            "plan_code": "free",
            "plan_name": "Free",
            "status": "active",
            "billing_cycle": "monthly",
            "started_at": datetime.now(timezone.utc),
            "expires_at": None,
        }

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT us.id, us.user_id, us.plan_id, p.code, p.name, us.status, us.billing_cycle, us.started_at, us.expires_at
                FROM user_subscriptions us
                JOIN plans p ON p.id = us.plan_id
                WHERE us.user_id = %s AND us.status = 'active'
                  AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
                ORDER BY us.id DESC
                LIMIT 1
                """,
                (user_id,),
            )
            row = cursor.fetchone()
            if row:
                return {
                    "id": row[0],
                    "user_id": row[1],
                    "plan_id": row[2],
                    "plan_code": row[3],
                    "plan_name": row[4],
                    "status": row[5],
                    "billing_cycle": row[6],
                    "started_at": row[7],
                    "expires_at": row[8],
                }

            # Return default Free plan without violating FK constraints if user_id is virtual
            cursor.execute("SELECT id, code, name FROM plans WHERE code = 'free' LIMIT 1")
            free_row = cursor.fetchone()
            plan_id = free_row[0] if free_row else 1
            plan_name = free_row[2] if free_row else "Free"

            now = datetime.now(timezone.utc)
            # Try to persist if user exists in table
            try:
                cursor.execute(
                    """
                    INSERT INTO user_subscriptions (user_id, plan_id, status, started_at)
                    VALUES (%s, %s, 'active', %s)
                    ON CONFLICT DO NOTHING
                    RETURNING id
                    """,
                    (user_id, plan_id, now),
                )
                connection.commit()
            except Exception:
                connection.rollback()

            return {
                "id": 1,
                "user_id": user_id,
                "plan_id": plan_id,
                "plan_code": "free",
                "plan_name": plan_name,
                "status": "active",
                "billing_cycle": "monthly",
                "started_at": now,
                "expires_at": None,
            }
    except Exception as e:
        logger.warning(f"[SubscriptionService] get_user_active_subscription fallback: {e}")
        return {
            "id": 1,
            "user_id": user_id,
            "plan_id": 1,
            "plan_code": "free",
            "plan_name": "Free",
            "status": "active",
            "billing_cycle": "monthly",
            "started_at": datetime.now(timezone.utc),
            "expires_at": None,
        }
    finally:
        connection.close()


def get_user_active_storage_addons(user_id: int) -> List[Dict[str, Any]]:
    """
    Returns active storage add-ons for the user.
    """
    try:
        ensure_subscription_tables_exist()
        connection = get_connection()
    except Exception:
        return []

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT usa.id, usa.user_id, usa.addon_id, sa.code, sa.name, sa.storage_bytes, usa.status, usa.started_at, usa.expires_at
                FROM user_storage_addons usa
                JOIN storage_addons sa ON sa.id = usa.addon_id
                WHERE usa.user_id = %s AND usa.status = 'active'
                  AND (usa.expires_at IS NULL OR usa.expires_at > CURRENT_TIMESTAMP)
                ORDER BY usa.started_at ASC
                """,
                (user_id,),
            )
            rows = cursor.fetchall()
            return [
                {
                    "id": r[0],
                    "user_id": r[1],
                    "addon_id": r[2],
                    "addon_code": r[3],
                    "addon_name": r[4],
                    "storage_bytes": int(r[5]),
                    "status": r[6],
                    "started_at": r[7],
                    "expires_at": r[8],
                }
                for r in rows
            ]
    except Exception as e:
        logger.debug(f"[SubscriptionService] get_user_active_storage_addons notice: {e}")
        return []
    finally:
        connection.close()


def get_user_storage_usage(user_id: int) -> int:
    """
    Calculates the total storage in bytes currently consumed by the user's projects & video assets.
    """
    try:
        connection = get_connection()
    except Exception:
        return 0

    total_bytes = 0
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT v.original_path, v.extracted_vocal_path, v.background_music_path,
                       v.transcript_path, v.subtitle_path, v.dubbed_audio_path, v.output_path
                FROM videos v
                JOIN projects p ON p.id = v.project_id
                WHERE p.owner_id = %s
                """,
                (user_id,),
            )
            rows = cursor.fetchall()
            for r in rows:
                for path_str in r:
                    if path_str:
                        p = Path(path_str)
                        if not p.is_absolute():
                            up = UPLOAD_DIR / path_str
                            out = OUTPUT_DIR / path_str
                            if up.exists():
                                total_bytes += up.stat().st_size
                            elif out.exists():
                                total_bytes += out.stat().st_size
                        elif p.exists():
                            total_bytes += p.stat().st_size

        return total_bytes
    except Exception as e:
        logger.debug(f"[SubscriptionService] Error calculating storage usage: {e}")
        return 0
    finally:
        connection.close()


def get_user_consumable_usage(user_id: int) -> Dict[str, int]:
    """
    Returns monthly AI processing credits used by the user.
    """
    try:
        connection = get_connection()
    except Exception:
        return {"credits_used": 0}

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COALESCE(SUM(credits_used), 0)
                FROM user_consumable_usage
                WHERE user_id = %s
                  AND period_start <= CURRENT_TIMESTAMP
                  AND period_end >= CURRENT_TIMESTAMP
                """,
                (user_id,),
            )
            row = cursor.fetchone()
            used = row[0] if row else 0
            return {"credits_used": int(used)}
    except Exception:
        return {"credits_used": 0}
    finally:
        connection.close()


def get_user_credit_audit_logs(user_id: int, limit: int = 50, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
    """
    Returns audit trail logs for credit deductions and allocations for this user.
    """
    try:
        ensure_subscription_tables_exist()
        connection = get_connection()
    except Exception:
        return [], 0

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM credit_audit_logs WHERE user_id = %s", (user_id,))
            total = cursor.fetchone()[0]

            cursor.execute(
                """
                SELECT id, user_id, video_id, job_id, service_type, credits_deducted, balance_after, description, created_at
                FROM credit_audit_logs
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                (user_id, limit, offset),
            )
            rows = cursor.fetchall()
            logs = [
                {
                    "id": r[0],
                    "user_id": r[1],
                    "video_id": r[2],
                    "job_id": str(r[3]) if r[3] else None,
                    "service_type": r[4],
                    "credits_deducted": r[5],
                    "balance_after": r[6],
                    "description": r[7],
                    "created_at": r[8],
                }
                for r in rows
            ]
            return logs, total
    except Exception as e:
        logger.debug(f"[SubscriptionService] get_user_credit_audit_logs error: {e}")
        return [], 0
    finally:
        connection.close()


def add_credit_audit_log(
    user_id: int,
    service_type: str,
    credits_deducted: int,
    balance_after: Optional[int] = None,
    description: Optional[str] = None,
    video_id: Optional[int] = None,
    job_id: Optional[str] = None,
    connection=None,
) -> bool:
    """
    Inserts a credit audit log entry within an existing or new DB transaction.
    """
    should_close = False
    if connection is None:
        try:
            connection = get_connection()
            should_close = True
        except Exception:
            return False

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO credit_audit_logs (
                    user_id, service_type, credits_deducted, balance_after, description, video_id, job_id, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                """,
                (user_id, service_type, credits_deducted, balance_after, description, video_id, job_id),
            )
        if should_close:
            connection.commit()
        return True
    except Exception as e:
        if should_close and connection:
            connection.rollback()
        logger.warning(f"[SubscriptionService] add_credit_audit_log error: {e}")
        return False
    finally:
        if should_close and connection:
            connection.close()


def get_user_effective_quota(user_id: int) -> Dict[str, Any]:
    """
    Resolves the user's complete effective quota:
    Effective Storage = Base Plan Storage + Active Storage Add-ons
    Effective Credits = Base Plan AI Credits
    All Features = True (enabled for all tiers per requirements)
    Limits = Dynamic limits from active plan
    """
    subscription = get_user_active_subscription(user_id)
    plan_code = subscription["plan_code"] if subscription else "free"

    plans = get_active_plans()
    target_plan = next((p for p in plans if p["code"] == plan_code), plans[0] if plans else DEFAULT_PLANS_SEED[0])

    storage_resource_bytes = 5368709120  # default 5 GB
    credits_resource = 1000  # default 1000 credits
    limits: Dict[str, Any] = {}
    features: Dict[str, bool] = {}

    for res in target_plan.get("resources", []):
        rtype = res["resource_type"]
        rkey = res["resource_key"]
        rval = res["limit_value"]

        if rtype == "STORAGE" and rkey == "storage_bytes":
            try:
                storage_resource_bytes = int(rval)
            except ValueError:
                pass
        elif rtype == "CONSUMABLE" and rkey == "ai_credits_monthly":
            try:
                credits_resource = int(rval)
            except ValueError:
                pass
        elif rtype == "LIMIT":
            try:
                limits[rkey] = int(rval)
            except ValueError:
                limits[rkey] = rval
        elif rtype == "FEATURE":
            features[rkey] = True

    active_addons = get_user_active_storage_addons(user_id)
    addon_bytes = sum(a["storage_bytes"] for a in active_addons)

    total_storage_bytes = storage_resource_bytes + addon_bytes
    used_storage_bytes = get_user_storage_usage(user_id)

    usage_percent = 0.0
    if total_storage_bytes > 0:
        usage_percent = round((used_storage_bytes / total_storage_bytes) * 100, 1)

    consumable_info = get_user_consumable_usage(user_id)
    used_credits = consumable_info["credits_used"]
    remaining_credits = max(0, credits_resource - used_credits)

    converted_total = credits_resource
    converted_used = used_credits
    converted_remaining = remaining_credits

    if "max_file_size_bytes" not in limits:
        limits["max_file_size_bytes"] = 524288000
    if "max_projects" not in limits:
        limits["max_projects"] = 5

    # Make sure core features are populated
    for fkey in [
        "ai_translation", "text_to_speech", "speaker_diarization", "hls_streaming",
        "video_editor", "document_export", "smart_subtitles", "batch_processing",
        "api_access", "priority_processing", "team_workspace"
    ]:
        if fkey not in features:
            features[fkey] = True

    return {
        "storage": {
            "total_bytes": total_storage_bytes,
            "total_gb": round(total_storage_bytes / (1024**3), 2),
            "used_bytes": used_storage_bytes,
            "used_gb": round(used_storage_bytes / (1024**3), 2),
            "included_bytes": storage_resource_bytes,
            "included_gb": round(storage_resource_bytes / (1024**3), 2),
            "addon_bytes": addon_bytes,
            "addon_gb": round(addon_bytes / (1024**3), 2),
            "usage_percent": usage_percent,
        },
        "credits": {
            "total_credits": credits_resource,
            "used_credits": used_credits,
            "remaining_credits": remaining_credits,
            "converted_minutes_total": converted_total,
            "converted_minutes_used": converted_used,
            "converted_minutes_remaining": converted_remaining,
        },
        "limits": limits,
        "features": features,
    }


def get_user_subscription_summary(user_id: int) -> Dict[str, Any]:
    """
    Returns full summary for the authenticated user: current subscription, active add-ons, and effective quota.
    """
    subscription = get_user_active_subscription(user_id)
    addons = get_user_active_storage_addons(user_id)
    effective_quota = get_user_effective_quota(user_id)

    return {
        "subscription": subscription,
        "addons": addons,
        "effective_quota": effective_quota,
    }


def get_user_usage_details(user_id: int) -> Dict[str, Any]:
    """
    Returns usage details for consumable resources and storage.
    """
    effective_quota = get_user_effective_quota(user_id)
    storage = effective_quota["storage"]
    credits = effective_quota["credits"]

    return {
        "user_id": user_id,
        "credits_allocated": credits["total_credits"],
        "credits_used": credits["used_credits"],
        "credits_remaining": credits["remaining_credits"],
        "storage_bytes_allocated": storage["total_bytes"],
        "storage_bytes_used": storage["used_bytes"],
        "storage_bytes_remaining": max(0, storage["total_bytes"] - storage["used_bytes"]),
    }


# =========================================================
# Subscription Entitlement Mutators (Transactional)
# =========================================================

def activate_plan_subscription(user_id: int, plan_id: int, billing_cycle: str = "monthly", connection=None) -> Dict[str, Any]:
    """
    Activates or upgrades a user's subscription in the database within a transaction.
    """
    should_close = False
    if connection is None:
        connection = get_connection()
        should_close = True

    try:
        with connection.cursor() as cursor:
            # 1. Fetch plan details
            cursor.execute("SELECT id, code, name, price_monthly, price_yearly FROM plans WHERE id = %s", (plan_id,))
            plan_row = cursor.fetchone()
            if not plan_row:
                raise ValueError(f"Plan ID {plan_id} does not exist.")

            plan_code = plan_row[1]
            plan_name = plan_row[2]

            # 2. Deactivate existing active subscriptions
            cursor.execute(
                """
                UPDATE user_subscriptions
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s AND status = 'active'
                """,
                (user_id,),
            )

            # 3. Calculate expiration date based on billing cycle
            now = datetime.now(timezone.utc)
            duration_days = 365 if billing_cycle == "yearly" else 30
            expires_at = now + timedelta(days=duration_days)

            # 4. Insert new active subscription
            cursor.execute(
                """
                INSERT INTO user_subscriptions (
                    user_id, plan_id, status, billing_cycle, started_at, expires_at, created_at, updated_at
                )
                VALUES (%s, %s, 'active', %s, %s, %s, %s, %s)
                RETURNING id, user_id, plan_id, status, billing_cycle, started_at, expires_at
                """,
                (user_id, plan_id, billing_cycle, now, expires_at, now, now),
            )
            sub_row = cursor.fetchone()

            # 5. Log in credit audit logs
            add_credit_audit_log(
                user_id=user_id,
                service_type="PLAN_UPGRADE",
                credits_deducted=0,
                description=f"Upgraded subscription to {plan_name} ({billing_cycle})",
                connection=connection,
            )

        if should_close:
            connection.commit()

        return {
            "id": sub_row[0],
            "user_id": sub_row[1],
            "plan_id": sub_row[2],
            "plan_code": plan_code,
            "plan_name": plan_name,
            "status": sub_row[3],
            "billing_cycle": sub_row[4],
            "started_at": sub_row[5],
            "expires_at": sub_row[6],
        }
    except Exception:
        if should_close and connection:
            connection.rollback()
        raise
    finally:
        if should_close and connection:
            connection.close()


def activate_storage_addon(user_id: int, addon_id: int, billing_cycle: str = "monthly", connection=None) -> Dict[str, Any]:
    """
    Activates an additional storage add-on for the user within a transaction.
    """
    should_close = False
    if connection is None:
        connection = get_connection()
        should_close = True

    try:
        with connection.cursor() as cursor:
            # 1. Fetch addon details
            cursor.execute("SELECT id, code, name, storage_bytes FROM storage_addons WHERE id = %s", (addon_id,))
            addon_row = cursor.fetchone()
            if not addon_row:
                raise ValueError(f"Storage Addon ID {addon_id} does not exist.")

            addon_code = addon_row[1]
            addon_name = addon_row[2]
            storage_bytes = addon_row[3]

            # 2. Expiration
            now = datetime.now(timezone.utc)
            duration_days = 365 if billing_cycle == "yearly" else 30
            expires_at = now + timedelta(days=duration_days)

            # 3. Insert user storage addon
            cursor.execute(
                """
                INSERT INTO user_storage_addons (
                    user_id, addon_id, status, started_at, expires_at, created_at, updated_at
                )
                VALUES (%s, %s, 'active', %s, %s, %s, %s)
                RETURNING id, user_id, addon_id, status, started_at, expires_at
                """,
                (user_id, addon_id, now, expires_at, now, now),
            )
            usa_row = cursor.fetchone()

            # 4. Audit trail
            add_credit_audit_log(
                user_id=user_id,
                service_type="STORAGE_ADDON_PURCHASE",
                credits_deducted=0,
                description=f"Purchased storage addon {addon_name} (+{round(storage_bytes / (1024**3))} GB)",
                connection=connection,
            )

        if should_close:
            connection.commit()

        return {
            "id": usa_row[0],
            "user_id": usa_row[1],
            "addon_id": usa_row[2],
            "addon_code": addon_code,
            "addon_name": addon_name,
            "storage_bytes": storage_bytes,
            "status": usa_row[3],
            "started_at": usa_row[4],
            "expires_at": usa_row[5],
        }
    except Exception:
        if should_close and connection:
            connection.rollback()
        raise
    finally:
        if should_close and connection:
            connection.close()


# =========================================================
# Quota Validation Enforcers
# =========================================================

def validate_upload_quota(user_id: int, new_file_size: int):
    """
    Validates that:
    1. new_file_size <= user's max_file_size_bytes
    2. current_used + new_file_size <= user's effective_storage_limit
    """
    effective_quota = get_user_effective_quota(user_id)
    limits = effective_quota["limits"]
    storage = effective_quota["storage"]

    max_file_size = int(limits.get("max_file_size_bytes", 524288000))
    if new_file_size > max_file_size:
        max_mb = max_file_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size ({new_file_size / (1024 * 1024):.1f} MB) exceeds your plan's maximum allowed limit of {max_mb:.0f} MB.",
        )

    current_storage = storage["used_bytes"]
    total_limit = storage["total_bytes"]
    if current_storage + new_file_size > total_limit:
        total_gb = total_limit / (1024**3)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"STORAGE_QUOTA_EXCEEDED: Uploading this file ({new_file_size / (1024 * 1024):.1f} MB) exceeds your total storage quota of {total_gb:.1f} GB. Please upgrade your plan or add a Storage Add-on.",
        )


def validate_project_quota(user_id: int):
    """
    Validates that user has not reached the max_projects limit.
    """
    effective_quota = get_user_effective_quota(user_id)
    max_projects = int(effective_quota["limits"].get("max_projects", 5))

    try:
        connection = get_connection()
    except Exception:
        return

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(id) FROM projects WHERE owner_id = %s", (user_id,))
            current_count = cursor.fetchone()[0]
            if current_count >= max_projects:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"PROJECT_LIMIT_EXCEEDED: You have reached the maximum allowed projects ({max_projects}) for your plan.",
                )
    finally:
        connection.close()


def has_feature(user_id: int, feature_key: str) -> bool:
    """
    Checks if a user has access to a feature.
    """
    return True


def get_limit(user_id: int, limit_key: str) -> Any:
    """
    Retrieves a specific limit from the user's active plan.
    """
    quota = get_user_effective_quota(user_id)
    return quota["limits"].get(limit_key)
