#!/bin/bash
set -e

# TaskFlow .deb Package Builder Script
# This script compiles the frontend, staging the package structure, and builds the .deb package.

ROOT_DIR="/home/tony/Documents/My Projects/taskflow"
STAGING_DIR="/home/tony/.gemini/antigravity-cli/brain/f9d7c418-6658-4e6d-a42a-2c1811df6a0c/scratch/taskflow_pkg"

echo "=============================================="
echo "Starting TaskFlow Debian Package Build"
echo "=============================================="

# 1. Clean previous build staging directories
echo "[1/6] Cleaning up previous staging build directories..."
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

# 2. Build the React Frontend
echo "[2/6] Building React frontend..."
cd "$ROOT_DIR/tailwind-frontend"

if [ ! -d "node_modules" ]; then
    echo "Frontend node_modules not found. Installing..."
    npm install
fi

echo "Compiling Vite build..."
VITE_API_URL="http://localhost:5000" npm run build

# 3. Assemble application files in staging directory
echo "[3/6] Staging backend files..."
BACKEND_STAGING="$STAGING_DIR/opt/taskflow"
mkdir -p "$BACKEND_STAGING"

# Copy backend files (excluding node_modules and env/git junk)
cp -r "$ROOT_DIR/taskflow-backend/api" "$BACKEND_STAGING/"
cp -r "$ROOT_DIR/taskflow-backend/config" "$BACKEND_STAGING/"
cp -r "$ROOT_DIR/taskflow-backend/controllers" "$BACKEND_STAGING/"
cp -r "$ROOT_DIR/taskflow-backend/middlewares" "$BACKEND_STAGING/"
cp -r "$ROOT_DIR/taskflow-backend/models" "$BACKEND_STAGING/"
cp -r "$ROOT_DIR/taskflow-backend/routes" "$BACKEND_STAGING/"
cp -r "$ROOT_DIR/taskflow-backend/utils" "$BACKEND_STAGING/"
cp "$ROOT_DIR/taskflow-backend/app.js" "$BACKEND_STAGING/"
cp "$ROOT_DIR/taskflow-backend/server.js" "$BACKEND_STAGING/"
cp "$ROOT_DIR/taskflow-backend/package.json" "$BACKEND_STAGING/"
cp "$ROOT_DIR/taskflow-backend/package-lock.json" "$BACKEND_STAGING/"

# Copy database schema/docs just for reference
cp "$ROOT_DIR/DATABASE_SCHEMA.md" "$BACKEND_STAGING/" || true

# Copy frontend build output to staging opt
echo "Staging frontend static assets..."
mkdir -p "$BACKEND_STAGING/frontend"
cp -r "$ROOT_DIR/tailwind-frontend/dist" "$BACKEND_STAGING/frontend/"

# Install production node dependencies inside staging
echo "Installing backend production dependencies in staging..."
cd "$BACKEND_STAGING"
npm install --omit=dev

# Copy .env file from user backend configuration to preserve settings (Supabase, etc.)
if [ -f "$ROOT_DIR/taskflow-backend/.env" ]; then
    echo "Copying existing database configuration (.env)..."
    cp "$ROOT_DIR/taskflow-backend/.env" "$BACKEND_STAGING/.env"
else
    echo "Warning: No .env database configuration found in taskflow-backend. Package will not include credentials."
fi

# Ensure uploads directory exists
mkdir -p "$BACKEND_STAGING/uploads"

# 4. Copy system configuration and metadata files
echo "[4/6] Copying package layout configuration..."

# Debian control and lifecycle scripts
mkdir -p "$STAGING_DIR/DEBIAN"
cp "$ROOT_DIR/packaging/control" "$STAGING_DIR/DEBIAN/control"
cp "$ROOT_DIR/packaging/postinst" "$STAGING_DIR/DEBIAN/postinst"
cp "$ROOT_DIR/packaging/prerm" "$STAGING_DIR/DEBIAN/prerm"
cp "$ROOT_DIR/packaging/postrm" "$STAGING_DIR/DEBIAN/postrm"

# Make postinst, prerm, postrm executable
chmod 755 "$STAGING_DIR/DEBIAN/postinst"
chmod 755 "$STAGING_DIR/DEBIAN/prerm"
chmod 755 "$STAGING_DIR/DEBIAN/postrm"

# Systemd service
mkdir -p "$STAGING_DIR/lib/systemd/system"
cp "$ROOT_DIR/packaging/taskflow.service" "$STAGING_DIR/lib/systemd/system/taskflow.service"

# Desktop shortcut
mkdir -p "$STAGING_DIR/usr/share/applications"
cp "$ROOT_DIR/packaging/taskflow.desktop" "$STAGING_DIR/usr/share/applications/taskflow.desktop"

# Logo/Icon
mkdir -p "$STAGING_DIR/usr/share/pixmaps"
if [ -f "$ROOT_DIR/tailwind-frontend/logo.png" ]; then
    cp "$ROOT_DIR/tailwind-frontend/logo.png" "$STAGING_DIR/usr/share/pixmaps/taskflow.png"
fi

# CLI Command Tool
mkdir -p "$STAGING_DIR/usr/bin"
cp "$ROOT_DIR/packaging/taskflow" "$STAGING_DIR/usr/bin/taskflow"
chmod 755 "$STAGING_DIR/usr/bin/taskflow"

# 5. Build the final .deb package
echo "[5/6] Building Debian package via dpkg-deb..."
cd "$ROOT_DIR"
dpkg-deb --root-owner-group --build "$STAGING_DIR" "$ROOT_DIR/taskflow_1.0.0_all.deb"

# 6. Cleaning staging
echo "[6/6] Cleaning up staging directory..."
rm -rf "$STAGING_DIR"

echo "=============================================="
echo "BUILD SUCCESSFUL!"
echo "Debian package is available at: $ROOT_DIR/taskflow_1.0.0_all.deb"
echo "=============================================="
