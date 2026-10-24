#!/bin/bash
# ============================================================================
# VIDNOVA PLATFORM - 1-Click Worker Node Deployment Script (Instance 2)
# Usage: ./scripts/deploy_worker.sh <MASTER_PRIVATE_IP>
# Example: ./scripts/deploy_worker.sh 172.31.47.2
# ============================================================================
set -e

MASTER_IP="${1:-172.31.47.2}"

echo "=========================================="
echo " Starting Worker Node Deployment (Connecting to $MASTER_IP)"
echo "=========================================="

# 1. Install Docker & dependencies
echo ">>> [1/4] Ensuring Docker and Docker Compose are ready..."
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    echo "Docker or Docker Compose plugin not found. Installing via official Docker script..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    rm -f /tmp/get-docker.sh
else
    echo "Docker and Docker Compose are already installed."
fi
sudo usermod -aG docker ubuntu || true

# 2. Configure 8GB Swap and mount NFS storage from Master
echo ">>> [2/4] Configuring 8GB Swap and NFS mounts..."
chmod +x scripts/*.sh || true
./scripts/setup_worker_nfs.sh "$MASTER_IP"

# 3. Update .env to connect to Master
echo ">>> [3/4] Updating .env for worker..."
./scripts/setup_worker_env.sh "$MASTER_IP"

# 4. Launch Worker Stack
echo ">>> [4/4] Launching Celery Worker Stack..."
docker compose -f docker-compose.worker.yml up -d --build

echo "=========================================="
echo ">>> Worker Node Deployment Complete! Connected to Master at $MASTER_IP"
echo "=========================================="
