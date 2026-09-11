import os
from pathlib import Path


UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)


APP_TITLE = "AI Video Translation Platform"


# =========================================================
# JWT
# =========================================================

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not configured.")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

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
# Email / Gmail OAuth2
# =========================================================

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
MAIL_FROM = os.getenv("MAIL_FROM")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REFRESH_TOKEN = os.getenv("GOOGLE_REFRESH_TOKEN")
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"


# =========================================================
# Production Object Storage: AWS S3 Primary + MinIO Fallback
# =========================================================

# Primary AWS S3 (Production Cloud)
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "").strip() or None
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip() or None
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-1").strip()
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "vidnova-media").strip()
AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL", "").strip() or None  # None for standard AWS S3 cloud

# Fallback MinIO Storage (High Availability / Failover)
MINIO_ENDPOINT_URL = os.getenv("MINIO_ENDPOINT_URL", os.getenv("S3_ENDPOINT_URL", "http://minio:9000")).strip()
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL", os.getenv("S3_PUBLIC_URL", "http://localhost:9000")).strip()
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", os.getenv("MINIO_ROOT_USER", "minioadmin")).strip()
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")).strip()
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "vidnova-media").strip()
MINIO_REGION = os.getenv("MINIO_REGION", "us-east-1").strip()

# Legacy alias for backward compatibility
S3_ENDPOINT_URL = MINIO_ENDPOINT_URL
S3_PUBLIC_URL = MINIO_PUBLIC_URL

# Circuit Breaker Configuration
STORAGE_CIRCUIT_BREAKER_ENABLED = os.getenv("STORAGE_CIRCUIT_BREAKER_ENABLED", "true").lower() in ("true", "1", "yes")
STORAGE_FAILURE_THRESHOLD = int(os.getenv("STORAGE_FAILURE_THRESHOLD", "3"))
STORAGE_RECOVERY_TIMEOUT_SECONDS = int(os.getenv("STORAGE_RECOVERY_TIMEOUT_SECONDS", "60"))

# Storage Mode: "auto" (default), "minio" (Direct MinIO for dev testing), "s3" (Production AWS S3 Primary)
STORAGE_MODE = os.getenv("STORAGE_MODE", os.getenv("STORAGE_PRIMARY", "auto")).strip().lower()



# =========================================================
# Hugging Face
# =========================================================

HF_TOKEN = os.getenv("HF_TOKEN", "").strip() or None


# =========================================================
# Video Processing
# =========================================================

TEMP_DIR = Path(os.getenv("TEMP_DIR", "./tmp"))
TEMP_DIR.mkdir(exist_ok=True)

SEGMENT_SECONDS = int(os.getenv("SEGMENT_SECONDS", "5"))


# =========================================================
# AI Models Configuration
# =========================================================

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
TRANSLATION_BACKEND = os.getenv("TRANSLATION_BACKEND", "nllb")
TTS_API_URL = os.getenv("TTS_API_URL", "http://tts-service:8001/generate_tts")


# =========================================================
# Database
# =========================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ai_video:ai_video@db:5432/ai_video"
)


# =========================================================
# Redis (for Celery)
# =========================================================

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")


# =========================================================
# Frontend URLs (for CORS, callbacks, etc.)
# =========================================================

VITE_S3_BUCKET_URL = os.getenv("VITE_S3_BUCKET_URL")
VITE_API_BASE_URL = os.getenv("VITE_API_BASE_URL", "http://127.0.0.1:8000")