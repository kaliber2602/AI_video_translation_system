#!/bin/bash
# ============================================================================
# VIDNOVA PLATFORM - Worker Node .env Adjustment (Instance 2)
# Usage: ./scripts/setup_worker_env.sh <MASTER_PRIVATE_IP>
# Example: ./scripts/setup_worker_env.sh 172.31.47.2
# ============================================================================
set -e

MASTER_IP="${1:-172.31.47.2}"

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo ">>> No .env found. Auto-generating from .env.example..."
        cp .env.example .env
    else
        echo "ERROR: .env or .env.example not found in current directory."
        exit 1
    fi
fi

echo ">>> Pointing database, redis, and minio URLs to Master at $MASTER_IP..."

# Replace @db:5432 with @MASTER_IP:5432
sed -i "s|@db:5432|@${MASTER_IP}:5432|g" .env

# Replace redis://redis:6379 with redis://MASTER_IP:6379
sed -i "s|redis://redis:6379|redis://${MASTER_IP}:6379|g" .env

# Replace http://minio:9000 with http://MASTER_IP:9000
sed -i "s|http://minio:9000|http://${MASTER_IP}:9000|g" .env

# Enable CUDA device by default on Worker
grep -q "^WHISPER_DEVICE=" .env && sed -i "s|^WHISPER_DEVICE=.*|WHISPER_DEVICE=cuda|g" .env || echo "WHISPER_DEVICE=cuda" >> .env
grep -q "^TRANSLATION_DEVICE=" .env && sed -i "s|^TRANSLATION_DEVICE=.*|TRANSLATION_DEVICE=cuda|g" .env || echo "TRANSLATION_DEVICE=cuda" >> .env
grep -q "^WHISPER_COMPUTE_TYPE=" .env && sed -i "s|^WHISPER_COMPUTE_TYPE=.*|WHISPER_COMPUTE_TYPE=int8_float16|g" .env || echo "WHISPER_COMPUTE_TYPE=int8_float16" >> .env

echo ">>> [SUCCESS] Worker .env updated to connect to Master ($MASTER_IP) with CUDA enabled!"
