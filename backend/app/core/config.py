import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ============================================================================
# DIRECTORY CONFIGURATION
# ============================================================================

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")

# Create directories if they don't exist
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

APP_TITLE = "AI Video Translation Platform"

# ============================================================================
# AWS S3 CONFIGURATION
# ============================================================================

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")

# Validate AWS configuration
if not AWS_ACCESS_KEY_ID:
    raise RuntimeError("AWS_ACCESS_KEY_ID is not configured in environment variables")

if not AWS_SECRET_ACCESS_KEY:
    raise RuntimeError("AWS_SECRET_ACCESS_KEY is not configured in environment variables")

if not AWS_S3_BUCKET:
    raise RuntimeError("AWS_S3_BUCKET is not configured in environment variables")

# ============================================================================
# VIDEO PROCESSING CONFIGURATION
# ============================================================================

SEGMENT_SECONDS = int(os.getenv("SEGMENT_SECONDS", "5"))

# ============================================================================
# TTS SERVICE CONFIGURATION
# ============================================================================

TTS_API_URL = os.getenv("TTS_API_URL", "http://tts-service:8001/generate_tts")

# ============================================================================
# LOGGING CONFIGURATION (Optional)
# ============================================================================

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")