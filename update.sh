#!/bin/bash

# update.sh - Updates the VS Manager software to the latest version

# Exit on error
set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (sudo ./update.sh)"
  exit 1
fi

echo "Starting Vintage Story Server Manager Update..."

# Get the real user who ran sudo
USER_NAME=${SUDO_USER:-$USER}
PROJECT_DIR=$(pwd)

echo "Updating as user: $USER_NAME"
echo "Project directory: $PROJECT_DIR"

# 1. Pull latest changes
echo "Pulling latest changes from git..."
# We need to run git pull as the user to avoid messing up file permissions
sudo -u "$USER_NAME" git pull

# 2. Rebuild Client
echo "Updating Client..."
cd "$PROJECT_DIR/client"
sudo -u "$USER_NAME" npm install
sudo -u "$USER_NAME" npm run build

# 3. Rebuild Server
echo "Updating Server..."
cd "$PROJECT_DIR/server"
sudo -u "$USER_NAME" npm install
sudo -u "$USER_NAME" npm run build

# 4. Restart Service
echo "Restarting VS Manager service..."
systemctl restart vsmanager

echo "----------------------------------------------------------------"
echo "Update Complete!"
echo "----------------------------------------------------------------"
