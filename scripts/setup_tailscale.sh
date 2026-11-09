#!/bin/bash
# ============================================================================
# VIDNOVA PLATFORM - 1-Click Tailscale Setup Script
# Usage: ./scripts/setup_tailscale.sh [TAILSCALE_AUTHKEY]
# Example: ./scripts/setup_tailscale.sh tskey-auth-k1234567890-abcdef
# ============================================================================
set -e

AUTH_KEY="${1}"

echo "=========================================="
echo " Setting up Tailscale WireGuard Mesh Network"
echo "=========================================="

# 1. Install Tailscale if not installed
if ! command -v tailscale &> /dev/null; then
    echo ">>> Installing Tailscale via official installer..."
    curl -fsSL https://tailscale.com/install.sh | sh
else
    echo ">>> Tailscale is already installed."
fi

# Ensure tailscaled service is started
sudo systemctl enable --now tailscaled 2>/dev/null || service tailscale start 2>/dev/null || true

# 2. Authenticate
if [ -n "$AUTH_KEY" ]; then
    echo ">>> Authenticating with provided Tailscale Auth Key..."
    sudo tailscale up --authkey="$AUTH_KEY" --accept-routes
else
    echo ">>> No auth key provided. Starting Tailscale (interactive login required)..."
    sudo tailscale up --accept-routes || true
fi

# 3. Display status
echo "=========================================="
echo ">>> Tailscale status:"
tailscale status 2>/dev/null || true
echo "------------------------------------------"
TS_IP=$(tailscale ip -4 2>/dev/null || true)
echo ">>> Your Tailscale Private IPv4: $TS_IP"
echo "=========================================="
