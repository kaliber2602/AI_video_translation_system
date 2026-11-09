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

# Ensure host-level Nginx doesn't conflict with Docker on port 80
echo "Ensuring host Nginx is stopped so Docker/Certbot can bind port 80..."
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl disable nginx 2>/dev/null || true

# 2. Setup NFS Server
echo ">>> [2/5] Setting up NFS Server..."
chmod +x scripts/*.sh || true
./scripts/setup_master_nfs.sh

# 3. Configure HTTP/HTTPS & SSL Certificates
echo ">>> [3/5] Configuring Web Server and SSL for $DOMAIN..."

IS_IP_MODE=false
if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || [ "$DOMAIN" = "localhost" ] || [ "$DOMAIN" = "http" ]; then
    IS_IP_MODE=true
fi

if [ "$IS_IP_MODE" = true ]; then
    echo ">>> Running in direct HTTP IP mode ($DOMAIN). Bypassing SSL certbot."
    # Use HTTP reverse proxy config (no SSL requirement)
    cp frontend/nginx.conf frontend/nginx.prod.conf
else
    # Try obtaining SSL certificate
    if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        echo "Obtaining SSL certificate from Let's Encrypt for $DOMAIN..."
        sudo systemctl stop nginx 2>/dev/null || true
        if sudo certbot certonly --standalone -d "$DOMAIN" --agree-tos -m "$EMAIL" --non-interactive; then
            echo "SSL certificate successfully obtained for $DOMAIN!"
        else
            echo "=========================================================================="
            echo "WARNING: Let's Encrypt could not verify $DOMAIN."
            echo "(This usually happens if your domain DNS does not point to this EC2 IP yet)."
            echo ">>> Automatically falling back to HTTP mode on port 80..."
            echo "=========================================================================="
            cp frontend/nginx.conf frontend/nginx.prod.conf
        fi
    else
        echo "Existing SSL certificate found for $DOMAIN."
    fi
fi

# 4. Launch Master Docker Stack
echo ">>> [4/5] Launching Master Docker Containers..."
docker compose -f docker-compose.master.yml up -d --build

# 5. Database tuning
echo ">>> [5/5] Aligning database configuration..."
sleep 5
docker compose -f docker-compose.master.yml exec -T db psql -U ai_video -d ai_video -c "UPDATE video_pipeline_configs SET stt_model = 'small'; UPDATE user_settings SET default_stt_model = 'small';" 2>/dev/null || docker exec vidnova-master-db psql -U ai_video -d ai_video -c "UPDATE video_pipeline_configs SET stt_model = 'small'; UPDATE user_settings SET default_stt_model = 'small';" 2>/dev/null || true
docker compose -f docker-compose.master.yml exec -T redis redis-cli --scan --pattern "lock:*" | xargs -r docker compose -f docker-compose.master.yml exec -T redis redis-cli del 2>/dev/null || true

echo "=========================================="
echo ">>> Master Node Deployment Complete! Web live at https://$DOMAIN"
if command -v tailscale &> /dev/null; then
    TS_IP=$(tailscale ip -4 2>/dev/null || true)
    if [ -n "$TS_IP" ]; then
        echo ">>> Master Tailscale Private IP: $TS_IP"
        echo ">>> (Use this IP to connect your Vast.ai Worker: ./scripts/deploy_vastai_worker.sh $TS_IP)"
    fi
fi
echo "=========================================="
