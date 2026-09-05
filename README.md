# AI Video Translation System

A starter full-stack project for an AI video translation and understanding platform.

## Stack
- Frontend: React + Vite
- Backend: FastAPI
- Storage/queue: Docker Compose with PostgreSQL, Redis, and MinIO

## Structure
- frontend/: React app shell
- backend/: FastAPI API
- docker-compose.yml: local development environment

## Quick start
1. Start services:
   ```bash
   docker compose up --build
   ```
2. Open the frontend at http://localhost:5173
3. Open the API docs at http://localhost:8000/docs

## Optional local models
The default Docker image uses a lightweight fallback pipeline so builds stay reliable.
If you want to run real Whisper/diarization models locally, install the optional extras separately:

```bash
pip install -r backend/requirements.txt -r backend/requirements-local.txt
```

## Demo Account
Admin
email:    admin@vidnova.com
password: Admin@123456
role:     admin

User
email:    user@vidnova.com
password: User@123456
role:     user


# .env File Format:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465

MAIL_FROM=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=


AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
HF_TOKEN=
TEMP_DIR=./tmp
SEGMENT_SECONDS=5

VITE_S3_BUCKET_URL=
VITE_API_BASE_URL=http://127.0.0.1:8000