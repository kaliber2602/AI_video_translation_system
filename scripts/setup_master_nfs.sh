#!/bin/bash
# ============================================================================
# VIDNOVA PLATFORM - Master Node NFS Storage Setup (Instance 1)
# ============================================================================
set -e

echo ">>> [1/3] Installing NFS Kernel Server..."
sudo apt-get update && sudo apt-get install -y nfs-kernel-server

echo ">>> [2/3] Preparing shared upload and output directories..."
mkdir -p backend/uploads backend/outputs
sudo chmod -R 777 backend/uploads backend/outputs

CURRENT_DIR=$(pwd)
echo ">>> [3/3] Exporting directories to AWS VPC (172.31.0.0/16) and Tailscale (100.64.0.0/10)..."
for SUBNET in "172.31.0.0/16" "100.64.0.0/10"; do
    grep -q "${CURRENT_DIR}/backend/uploads ${SUBNET}" /etc/exports 2>/dev/null || echo "${CURRENT_DIR}/backend/uploads ${SUBNET}(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
    grep -q "${CURRENT_DIR}/backend/outputs ${SUBNET}" /etc/exports 2>/dev/null || echo "${CURRENT_DIR}/backend/outputs ${SUBNET}(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
done

sudo exportfs -ra
sudo systemctl restart nfs-kernel-server
sudo systemctl enable nfs-kernel-server

echo ">>> [SUCCESS] Master Node NFS Server is active and ready!"
