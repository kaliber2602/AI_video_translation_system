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
# AWS S3 / MinIO Configuration
# =========================================================

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "http://minio:9000")

# Optional: Validate AWS config (uncomment if required)
# if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET]):
#     raise RuntimeError("AWS credentials and bucket name are required.")


# =========================================================
# Hugging Face
# =========================================================

HF_TOKEN = os.getenv("HF_TOKEN")


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