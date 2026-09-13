#!/bin/sh
set -e

echo "[entrypoint] applying database migrations..."
pnpm run db:migrate

echo "[entrypoint] seeding default settings (skips if already present)..."
pnpm run db:seed

echo "[entrypoint] ensuring admin account exists (skips if ADMIN_EMAIL/ADMIN_PASSWORD unset or account already exists)..."
pnpm run create-user

echo "[entrypoint] starting server..."
exec node .output/server/index.mjs
