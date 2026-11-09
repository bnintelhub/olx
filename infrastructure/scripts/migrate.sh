#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-staging}"
echo "🗄️ Running Prisma migrations for ${ENV}..."

pnpm --filter @olx/database db:deploy || pnpm --filter @olx/database db:push

echo "✅ Database schema is up to date."

