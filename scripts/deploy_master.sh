#!/bin/bash
# ============================================================================
# VIDNOVA PLATFORM - 1-Click Master Node Deployment Script (Instance 1)
# Usage: ./scripts/deploy_master.sh [DOMAIN] [EMAIL]
# Example: ./scripts/deploy_master.sh videonova.site user@gmail.com
# ============================================================================
set -e

DOMAIN="${1:-videonova.site}"
EMAIL="${2:-admin@videonova.site}"

echo "=========================================="
echo " Starting Master Node Deployment for $DOMAIN"
echo "=========================================="

# 1. Update system and install required packages
echo ">>> [1/5] Ensuring Docker, Docker Compose, Certbot, and NFS Server are ready..."
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    echo "Docker or Docker Compose plugin not found. Installing via official Docker script..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    rm -f /tmp/get-docker.sh
else
    echo "Docker and Docker Compose are already installed."
fi
sudo usermod -aG docker ubuntu || true

echo "Installing Certbot and NFS server packages..."
sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx nfs-kernel-server

# 2. Setup NFS Server
echo ">>> [2/5] Setting up NFS Server..."
chmod +x scripts/*.sh || true
./scripts/setup_master_nfs.sh

# 3. Generate Let's Encrypt SSL Certificate if not already present
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo ">>> [3/5] Obtaining SSL certificate from Let's Encrypt for $DOMAIN and www.$DOMAIN..."
    sudo certbot certonly --standalone -d "$DOMAIN" -d "www.$DOMAIN" --agree-tos -m "$EMAIL" --non-interactive
else
    echo ">>> [3/5] Existing SSL certificate found for $DOMAIN. Skipping certbot."
fi

# 4. Launch Master Docker Stack
echo ">>> [4/5] Launching Master Docker Containers..."
docker compose -f docker-compose.master.yml up -d --build

# 5. Database tuning
echo ">>> [5/5] Aligning database configuration..."
sleep 5
docker exec vidnova-db-1 psql -U ai_video -d ai_video -c "UPDATE video_pipeline_configs SET stt_model = 'small'; UPDATE user_settings SET default_stt_model = 'small';" 2>/dev/null || true
docker exec vidnova-redis-1 redis-cli --scan --pattern "lock:*" | xargs -r docker exec vidnova-redis-1 redis-cli del 2>/dev/null || true

echo "=========================================="
echo ">>> Master Node Deployment Complete! Web live at https://$DOMAIN"
echo "=========================================="
