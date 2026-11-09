#!/bin/bash
# ============================================================================
# VIDNOVA PLATFORM - Worker Node NFS Mount & 8GB Swap Setup (Instance 2)
# Usage: ./scripts/setup_worker_nfs.sh <MASTER_PRIVATE_IP>
# Example: ./scripts/setup_worker_nfs.sh 172.31.47.2
# ============================================================================
set -e

MASTER_IP="${1:-172.31.47.2}"
SPECIFIC_PATH="${2}"

echo ">>> [1/4] Installing NFS client..."
sudo apt-get update && sudo apt-get install -y nfs-common

echo ">>> [2/4] Configuring 8 GB Virtual Swap (Anti-OOM buffer)..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 8G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=8192
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile 2>/dev/null || true
    grep -q "/swapfile" /etc/fstab 2>/dev/null || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap created successfully."
else
    echo "Swapfile already exists."
fi

echo ">>> [3/4] Preparing mount folders..."
mkdir -p backend/uploads backend/outputs
CURRENT_DIR=$(pwd)

echo ">>> [4/4] Detecting and mounting shared NFS storage from Master ($MASTER_IP)..."

# Auto-detect exported paths from Master via showmount
REMOTE_UPLOADS=""
REMOTE_OUTPUTS=""

if [ -n "$SPECIFIC_PATH" ]; then
    REMOTE_UPLOADS="${SPECIFIC_PATH}/uploads"
    REMOTE_OUTPUTS="${SPECIFIC_PATH}/outputs"
else
    # Try querying NFS exports from Master
    AVAILABLE_EXPORTS=$(showmount -e "${MASTER_IP}" 2>/dev/null || true)
    REMOTE_UPLOADS=$(echo "$AVAILABLE_EXPORTS" | grep -m1 "uploads" | awk '{print $1}')
    REMOTE_OUTPUTS=$(echo "$AVAILABLE_EXPORTS" | grep -m1 "outputs" | awk '{print $1}')
fi

# Fallback if discovery failed
if [ -z "$REMOTE_UPLOADS" ]; then
    echo "Notice: Could not auto-discover NFS exports from $MASTER_IP via showmount. Using fallback default paths."
    REMOTE_UPLOADS="/home/ubuntu/AI_video_translation_system/backend/uploads"
    REMOTE_OUTPUTS="/home/ubuntu/AI_video_translation_system/backend/outputs"
fi

echo "Mounting: ${MASTER_IP}:${REMOTE_UPLOADS} -> ${CURRENT_DIR}/backend/uploads"
sudo mount -t nfs -o proto=tcp,port=2049 "${MASTER_IP}:${REMOTE_UPLOADS}" backend/uploads || sudo mount -t nfs "${MASTER_IP}:${REMOTE_UPLOADS}" backend/uploads || true

echo "Mounting: ${MASTER_IP}:${REMOTE_OUTPUTS} -> ${CURRENT_DIR}/backend/outputs"
sudo mount -t nfs -o proto=tcp,port=2049 "${MASTER_IP}:${REMOTE_OUTPUTS}" backend/outputs || sudo mount -t nfs "${MASTER_IP}:${REMOTE_OUTPUTS}" backend/outputs || true

grep -q "${CURRENT_DIR}/backend/uploads" /etc/fstab 2>/dev/null || echo "${MASTER_IP}:${REMOTE_UPLOADS} ${CURRENT_DIR}/backend/uploads nfs defaults,_netdev 0 0" | sudo tee -a /etc/fstab
grep -q "${CURRENT_DIR}/backend/outputs" /etc/fstab 2>/dev/null || echo "${MASTER_IP}:${REMOTE_OUTPUTS} ${CURRENT_DIR}/backend/outputs nfs defaults,_netdev 0 0" | sudo tee -a /etc/fstab

echo ">>> [SUCCESS] Worker Node NFS Storage & Swap configured successfully!"
