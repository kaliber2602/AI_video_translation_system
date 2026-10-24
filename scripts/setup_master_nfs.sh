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
echo ">>> [3/3] Exporting directories to AWS VPC subnet 172.31.0.0/16..."
grep -q "${CURRENT_DIR}/backend/uploads" /etc/exports || echo "${CURRENT_DIR}/backend/uploads 172.31.0.0/16(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
grep -q "${CURRENT_DIR}/backend/outputs" /etc/exports || echo "${CURRENT_DIR}/backend/outputs 172.31.0.0/16(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports

sudo exportfs -ra
sudo systemctl restart nfs-kernel-server
sudo systemctl enable nfs-kernel-server

echo ">>> [SUCCESS] Master Node NFS Server is active and ready!"
