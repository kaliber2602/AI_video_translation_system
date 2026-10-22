#!/bin/bash
# ============================================================================
# VIDNOVA PLATFORM - Worker Node NFS Mount & 8GB Swap Setup (Instance 2)
# Usage: ./scripts/setup_worker_nfs.sh <MASTER_PRIVATE_IP>
# Example: ./scripts/setup_worker_nfs.sh 172.31.47.2
# ============================================================================
set -e

MASTER_IP="${1:-172.31.47.2}"

echo ">>> [1/4] Installing NFS client..."
sudo apt-get update && sudo apt-get install -y nfs-common

echo ">>> [2/4] Configuring 8 GB Virtual Swap (Anti-OOM buffer)..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 8G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    grep -q "/swapfile" /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap created successfully."
else
    echo "Swapfile already exists."
fi

echo ">>> [3/4] Preparing mount folders..."
mkdir -p backend/uploads backend/outputs

echo ">>> [4/4] Mounting shared NFS storage from Master ($MASTER_IP)..."
sudo mount -t nfs "${MASTER_IP}:/home/ubuntu/vidnova/backend/uploads" backend/uploads || true
sudo mount -t nfs "${MASTER_IP}:/home/ubuntu/vidnova/backend/outputs" backend/outputs || true

grep -q "backend/uploads" /etc/fstab || echo "${MASTER_IP}:/home/ubuntu/vidnova/backend/uploads /home/ubuntu/vidnova/backend/uploads nfs defaults 0 0" | sudo tee -a /etc/fstab
grep -q "backend/outputs" /etc/fstab || echo "${MASTER_IP}:/home/ubuntu/vidnova/backend/outputs /home/ubuntu/vidnova/backend/outputs nfs defaults 0 0" | sudo tee -a /etc/fstab

echo ">>> [SUCCESS] Worker Node NFS Storage & Swap configured successfully!"
