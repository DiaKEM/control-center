#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?Usage: build-package.sh <version>}"
OUT="diakem-control-center-${VERSION}.zip"

echo "Building frontend..."
cd frontend && npm run build && cd ..

echo "Building backend..."
cd backend && npm run build && cd ..

echo "Staging release structure..."
rm -rf .release
mkdir -p .release/frontend .release/backend

cp -r frontend/dist/. .release/frontend/
cp -r backend/dist/. .release/backend/
cp backend/package.json backend/package-lock.json backend/.env.example .release/backend/

echo "Creating ${OUT}..."
cd .release && zip -r "../${OUT}" frontend backend && cd ..
rm -rf .release

echo "Done: ${OUT}"
