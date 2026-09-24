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

RUN pip install --no-cache-dir --default-timeout=120 --retries 5 \
    torch==2.5.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cu124 && \
    pip install --no-cache-dir --default-timeout=120 --retries 5 \
    -r requirements.txt

COPY . ./

ENV COQUI_TOS_AGREED=1 \
    WHISPER_MODEL=small \
    WHISPER_DEVICE=auto \
    TRANSLATION_BACKEND=nllb \
    HF_HOME=/opt/model-cache/hf

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
