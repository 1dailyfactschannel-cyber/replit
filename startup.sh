#!/bin/sh
set -e

echo "[startup] Running database migrations..."
node script/migrate.js || echo "[startup] Migration script exited with error, continuing..."

echo "[startup] Starting server..."
exec node dist/index.js
