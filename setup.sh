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
# We allow update to fail because sometimes third-party repos (like monarx) are broken, 
# but standard repos might still work for installing our dependencies.
apt-get update || echo "Warning: apt-get update failed, attempting to install dependencies anyway..."
apt-get install -y curl wget git nginx certbot python3-certbot-nginx unzip libicu-dev acl build-essential

# 2. Install Node.js (if not installed)
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "Node.js or npm not found. Installing Node.js 20..."
    # Try to install from nodesource
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || echo "Nodesource setup failed, trying default repos..."
    apt-get install -y nodejs
    
    # If npm is still not found (some distros separate it), install it explicitly
    if ! command -v npm &> /dev/null; then
        echo "npm not found after nodejs install. Installing npm package..."
        apt-get install -y npm
    fi
else
    echo "Node.js and npm are already installed."
fi

# 3. Prepare Environment
echo "Preparing environment..."

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
    else
        echo "Creating default .env..."
        echo "PORT=3001" > .env
        echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
        echo "DEFAULT_PASSWORD=admin123" >> .env
    fi
    # Set ownership of .env immediately
    chown "$USER_NAME:$USER_NAME" .env
fi

# Fix permissions BEFORE build to ensure npm install works
echo "Fixing permissions..."
chown -R "$USER_NAME:$USER_NAME" "$PROJECT_DIR"

# 4. Install Project Dependencies & Build
echo "Installing project dependencies and building..."

# Helper function to run command as user
run_as_user() {
    if [ "$USER_NAME" = "root" ]; then
        "$@"
    else
        sudo -u "$USER_NAME" "$@"
    fi
}

# Client
echo "Building Client..."
cd "$PROJECT_DIR/client"
# Run npm as the actual user to avoid permission issues later, or fix permissions after
run_as_user npm install
run_as_user npm run build

# Server
echo "Building Server..."
cd "$PROJECT_DIR/server"
run_as_user npm install
run_as_user npm run build

# Return to root
cd "$PROJECT_DIR"

# 5. Setup Systemd Service
echo "Setting up Systemd service..."
SERVICE_FILE="/etc/systemd/system/vsmanager.service"

NPM_PATH=$(which npm)
if [ -z "$NPM_PATH" ]; then
    echo "Error: npm not found. Cannot create service file."
    exit 1
fi

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Vintage Story Server Manager
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$PROJECT_DIR/server
ExecStart=$NPM_PATH start
Restart=on-failure
Environment=PORT=3001
# Add other env vars here if needed, or load from .env file
# EnvironmentFile=$PROJECT_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vsmanager

# 6. Nginx Setup
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

# 7. Start Service
echo "Starting VS Manager..."
systemctl restart vsmanager

# Wait for service to start
echo "Waiting for service to start..."
for i in {1..10}; do
    if systemctl is-active --quiet vsmanager; then
        echo "Service is running!"
        break
    fi
    echo "."
    sleep 1
done

if ! systemctl is-active --quiet vsmanager; then
    echo "Error: Service failed to start. Check logs with: journalctl -u vsmanager -n 50"
    exit 1
fi

echo "----------------------------------------------------------------"
echo "Setup Complete!"
if [ -n "$DOMAIN" ]; then
    echo "Access your server at http://$DOMAIN (or https://$DOMAIN if SSL was successful)"
else
    echo "Access your server at http://YOUR_SERVER_IP:3001"
fi
echo "----------------------------------------------------------------"
