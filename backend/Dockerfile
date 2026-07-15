FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    git \
    libsndfile1 \
    libgl1 \
    libglib2.0-0 \
    espeak-ng \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN pip install \
    --no-cache-dir \
    --default-timeout=60 \
    --retries 5 \
    -r requirements.txt

COPY . ./

ENV COQUI_TOS_AGREED=1 \
    WHISPER_MODEL=small \
    WHISPER_DEVICE=cpu \
    TRANSLATION_BACKEND=nllb \
    HF_HOME=/opt/model-cache/hf

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
