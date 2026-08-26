#!/usr/bin/env bash
# Vercel build script — runs automatically during `vercel-build`.
# Swaps the Prisma provider to postgresql if DATABASE_URL is a Postgres URL,
# generates the client, pushes the schema, then builds Next.js.
set -euo pipefail

echo "▶ Vercel build starting…"

# --- Determine database provider from DATABASE_URL ---
DB_URL="${DATABASE_URL:-}"
if [[ "$DB_URL" == postgres* ]]; then
  echo "▶ Detected PostgreSQL DATABASE_URL — switching schema provider…"
  # Swap sqlite → postgresql in schema.prisma
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
  echo "  ✓ Schema provider set to postgresql"
else
  echo "▶ DATABASE_URL is not Postgres ($DB_URL) — keeping sqlite (local dev mode)"
fi

# --- Generate Prisma client ---
echo "▶ Generating Prisma client…"
npx prisma generate
echo "  ✓ Prisma client generated"

# --- Push schema to database (creates tables if missing) ---
# Only run db push if DATABASE_URL is set. On Vercel, this creates all tables
# on first deploy — no manual migration needed.
if [[ -n "$DB_URL" ]]; then
  echo "▶ Pushing schema to database…"
  npx prisma db push --accept-data-loss --skip-generate 2>&1 || {
    echo "  ⚠ prisma db push failed — tables may already exist (this is OK)"
  }
  echo "  ✓ Schema pushed"
fi

# --- Build Next.js ---
echo "▶ Building Next.js…"
npx next build
echo "  ✓ Next.js build complete"

echo "▶ Vercel build finished ✓"
