import os
import psycopg2
from passlib.context import CryptContext

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ai_video:ai_video@db:5432/ai_video")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

BENCH_USERS = [
    {"email": f"bench_user{i}@vidnova.com", "password": "User@123456", "full_name": f"Benchmark Tester {i}", "role": "user"}
    for i in range(1, 5)
]

def seed():
    conn = psycopg2.connect(DATABASE_URL)
    with conn.cursor() as cur:
        # Get Pro plan id
        cur.execute("SELECT id FROM plans WHERE code = 'pro';")
        pro_row = cur.fetchone()
        pro_id = pro_row[0] if pro_row else 1

        for u in BENCH_USERS:
            cur.execute("SELECT id FROM users WHERE email = %s;", (u["email"],))
            row = cur.fetchone()
            if row:
                uid = row[0]
                cur.execute("UPDATE users SET is_active = TRUE WHERE id = %s;", (uid,))
                print(f"[Seed] User exists: {u['email']} (id: {uid})")
            else:
                pw_hash = pwd_context.hash(u["password"])
                cur.execute("""
                    INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, TRUE, NOW(), NOW())
                    RETURNING id;
                """, (u["email"], pw_hash, u["full_name"], u["role"]))
                uid = cur.fetchone()[0]
                print(f"[Seed] Created user: {u['email']} (id: {uid})")

            # Ensure active subscription
            cur.execute("SELECT id FROM user_subscriptions WHERE user_id = %s;", (uid,))
            sub = cur.fetchone()
            if not sub:
                cur.execute("""
                    INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle, started_at, created_at, updated_at)
                    VALUES (%s, %s, 'active', 'monthly', NOW(), NOW(), NOW());
                """, (uid, pro_id))

        conn.commit()
    conn.close()
    print("[Seed] 4 Benchmark Users are ready!")

if __name__ == "__main__":
    seed()
