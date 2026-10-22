#!/bin/bash
# ============================================================================
# VIDNOVA PLATFORM - Worker Node .env Adjustment (Instance 2)
# Usage: ./scripts/setup_worker_env.sh <MASTER_PRIVATE_IP>
# Example: ./scripts/setup_worker_env.sh 172.31.47.2
# ============================================================================
set -e

MASTER_IP="${1:-172.31.47.2}"

if [ ! -f .env ]; then
    echo "ERROR: .env file not found in current directory. Please ensure .env is present."
    exit 1
fi

echo ">>> Pointing database, redis, and minio URLs to Master at $MASTER_IP..."

# Replace @db:5432 with @MASTER_IP:5432
sed -i "s|@db:5432|@${MASTER_IP}:5432|g" .env

# Replace redis://redis:6379 with redis://MASTER_IP:6379
sed -i "s|redis://redis:6379|redis://${MASTER_IP}:6379|g" .env

# Replace http://minio:9000 with http://MASTER_IP:9000
sed -i "s|http://minio:9000|http://${MASTER_IP}:9000|g" .env

echo ">>> [SUCCESS] Worker .env updated to connect to Master ($MASTER_IP)!"
