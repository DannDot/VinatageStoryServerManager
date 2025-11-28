#!/bin/bash

# Exit on error
set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (sudo ./setup.sh)"
  exit 1
fi

echo "Starting Vintage Story Server Manager Setup..."

# Get the real user who ran sudo
USER_NAME=${SUDO_USER:-$USER}
USER_HOME=$(getent passwd "$USER_NAME" | cut -d: -f6)
PROJECT_DIR=$(pwd)

echo "Installing as user: $USER_NAME"
echo "Project directory: $PROJECT_DIR"

# 1. Install System Dependencies
echo "Installing system dependencies..."
apt-get update
apt-get install -y curl wget git nginx certbot python3-certbot-nginx unzip libicu-dev acl build-essential

# 2. Install Node.js (if not installed)
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js is already installed."
fi

# 3. Install Project Dependencies & Build
echo "Installing project dependencies and building..."

# Client
echo "Building Client..."
cd "$PROJECT_DIR/client"
# Run npm as the actual user to avoid permission issues later, or fix permissions after
sudo -u "$USER_NAME" npm install
sudo -u "$USER_NAME" npm run build

# Server
echo "Building Server..."
cd "$PROJECT_DIR/server"
sudo -u "$USER_NAME" npm install
sudo -u "$USER_NAME" npm run build

# Return to root
cd "$PROJECT_DIR"

# 4. Setup Systemd Service
echo "Setting up Systemd service..."
SERVICE_FILE="/etc/systemd/system/vsmanager.service"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Vintage Story Server Manager
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$PROJECT_DIR/server
ExecStart=$(which npm) start
Restart=on-failure
Environment=PORT=3001
# Add other env vars here if needed, or load from .env file
# EnvironmentFile=$PROJECT_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vsmanager

# 5. Nginx Setup
echo "Setting up Nginx..."

# Load .env variables if they exist
if [ -f .env ]; then
    # Export variables from .env, ignoring comments
    export $(grep -v '^#' .env | xargs)
fi

DOMAIN=${DOMAIN:-""}
EMAIL=${LETS_ENCRYPT_EMAIL:-""}

if [ -z "$DOMAIN" ]; then
    echo "No DOMAIN found in .env. Skipping Nginx/SSL setup."
    echo "The server will be available at http://localhost:3001"
else
    echo "Configuring Nginx for domain: $DOMAIN"
    
    NGINX_CONF="/etc/nginx/sites-available/vsmanager"
    
    cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl reload nginx

    # 6. SSL Setup
    if [ -n "$EMAIL" ]; then
        echo "Setting up SSL with Let's Encrypt..."
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
    else
        echo "No LETS_ENCRYPT_EMAIL found. Skipping SSL cert generation."
    fi
fi

# 7. Fix Permissions (just in case)
echo "Fixing permissions..."
chown -R "$USER_NAME:$USER_NAME" "$PROJECT_DIR"

# 8. Start Service
echo "Starting VS Manager..."
systemctl restart vsmanager

echo "----------------------------------------------------------------"
echo "Setup Complete!"
if [ -n "$DOMAIN" ]; then
    echo "Access your server at http://$DOMAIN (or https://$DOMAIN if SSL was successful)"
else
    echo "Access your server at http://YOUR_SERVER_IP:3001"
fi
echo "----------------------------------------------------------------"
