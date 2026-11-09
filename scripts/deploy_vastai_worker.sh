#!/bin/bash
# ============================================================================
# VIDNOVA PLATFORM - 1-Click Vast.ai GPU Worker Bootstrap Script
# Usage: ./scripts/deploy_vastai_worker.sh <MASTER_TAILSCALE_IP> [TAILSCALE_AUTHKEY]
# Example: ./scripts/deploy_vastai_worker.sh 100.80.25.10 tskey-auth-k1234567890-abcdef
# ============================================================================
set -e

MASTER_IP="${1}"
AUTH_KEY="${2}"

if [ -z "$MASTER_IP" ]; then
    echo "========================================================================"
    echo "ERROR: Missing Master Tailscale IP."
    echo "Usage: ./scripts/deploy_vastai_worker.sh <MASTER_TAILSCALE_IP> [TAILSCALE_AUTHKEY]"
    echo "Example: ./scripts/deploy_vastai_worker.sh 100.80.25.10 tskey-auth-k123456"
    echo "========================================================================"
    exit 1
fi

echo "========================================================================"
echo " Starting Vast.ai GPU Worker Deployment (Targeting Master at $MASTER_IP)"
echo "========================================================================"

# Step 1: Ensure Tailscale is installed and connected
echo ">>> [1/5] Checking Tailscale VPN..."
if ! command -v tailscale &> /dev/null; then
    echo "Installing Tailscale..."
    curl -fsSL https://tailscale.com/install.sh | sh
fi
sudo systemctl enable --now tailscaled 2>/dev/null || service tailscale start 2>/dev/null || true

CURRENT_TS_IP=$(tailscale ip -4 2>/dev/null || true)
if [ -z "$CURRENT_TS_IP" ]; then
    if [ -n "$AUTH_KEY" ]; then
        echo "Connecting Tailscale via Auth Key..."
        tailscale up --authkey="$AUTH_KEY" --accept-routes
    else
        echo "Connecting Tailscale (interactive)..."
        tailscale up --accept-routes
    fi
fi

# Verify ping to Master
echo "Testing connection to Master ($MASTER_IP)..."
if ping -c 2 -W 3 "$MASTER_IP" > /dev/null 2>&1; then
    echo ">>> Connection to Master ($MASTER_IP) confirmed via Tailscale!"
else
    echo ">>> WARNING: Ping to Master ($MASTER_IP) failed. Please check if Tailscale is running on Master."
fi

# Step 2: Configure NFS storage mounts
echo ">>> [2/5] Mounting shared NFS storage from Master..."
chmod +x scripts/*.sh || true
./scripts/setup_worker_nfs.sh "$MASTER_IP"

# Step 3: Update .env configuration
echo ">>> [3/5] Updating worker environment configuration..."
./scripts/setup_worker_env.sh "$MASTER_IP"

# Step 4: Verify GPU
echo ">>> [4/5] Checking NVIDIA GPU status..."
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
else
    echo ">>> WARNING: nvidia-smi not found. Ensure this instance has an NVIDIA GPU attached."
fi

# Step 5: Launch Celery Worker
echo ">>> [5/5] Launching Celery Worker Stack..."
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "Starting Celery Worker inside Docker GPU container..."
    docker compose -f docker-compose.worker.yml up -d --build
    echo "========================================================================"
    echo ">>> Celery Worker started in Docker container! Logs:"
    echo "    docker compose -f docker-compose.worker.yml logs -f"
    echo "========================================================================"
else
    echo "Docker not running in this container environment. Launching native Celery worker..."
    echo "Ensuring Python dependencies..."
    pip install --no-cache-dir -r backend/requirements-gpu.txt 2>/dev/null || true
    
    # Export env vars
    set -a
    source .env
    set +a
    
    echo "Starting Celery worker process (GPU mode)..."
    nohup celery -A backend.app.tasks.celery_app worker \
        --loglevel=info \
        -Q queue_media,queue_pipeline,queue_stt,queue_translate,queue_tts \
        -P solo \
        -Ofair > celery_worker.log 2>&1 &
    
    echo "========================================================================"
    echo ">>> Celery Worker is running in background (PID: $!)"
    echo ">>> View logs with: tail -f celery_worker.log"
    echo "========================================================================"
fi
