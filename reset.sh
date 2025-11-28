#!/bin/bash

# reset.sh - Wipes all server data and resets to a fresh state

# Exit on error
set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (sudo ./reset.sh)"
  exit 1
fi

echo "================================================================"
echo "WARNING: This will wipe ALL server data, including:"
echo " - All Game Instances"
echo " - All Saves and Worlds"
echo " - All Backups"
echo " - All Logs"
echo " - Database (Users, Settings, Roles)"
echo " - Downloaded Server Versions"
echo "================================================================"
echo "This action CANNOT be undone."
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo "Stopping VS Manager service..."
systemctl stop vsmanager || echo "Service was not running."

PROJECT_DIR=$(pwd)
SERVER_DATA="$PROJECT_DIR/server/server-data"
VERSIONS_DIR="$PROJECT_DIR/server/versions"

echo "Wiping server data..."
# Remove specific directories to be safe, or just the whole folder content
if [ -d "$SERVER_DATA" ]; then
    rm -rf "$SERVER_DATA"/*
    echo "Cleared $SERVER_DATA"
fi

echo "Wiping server versions..."
if [ -d "$VERSIONS_DIR" ]; then
    rm -rf "$VERSIONS_DIR"/*
    echo "Cleared $VERSIONS_DIR"
fi

# Optional: Remove Systemd and Nginx config
echo
read -p "Do you also want to remove the Systemd service and Nginx config (Full Uninstall)? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing Systemd service..."
    systemctl disable vsmanager || true
    rm -f /etc/systemd/system/vsmanager.service
    systemctl daemon-reload

    echo "Removing Nginx config..."
    rm -f /etc/nginx/sites-enabled/vsmanager
    rm -f /etc/nginx/sites-available/vsmanager
    systemctl reload nginx
    
    echo "System integration removed."
    echo "To reinstall, run ./setup.sh"
else
    echo "System integration kept."
    echo "To restart the server with fresh data, run: systemctl start vsmanager"
fi

echo "----------------------------------------------------------------"
echo "Reset Complete!"
echo "----------------------------------------------------------------"
