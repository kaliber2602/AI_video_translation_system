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
