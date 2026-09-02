#!/usr/bin/env bash
# Create demo auth users via Supabase Admin API (safe — Supabase fills all
# internal auth fields correctly). UUIDs match the profiles rows in seed.sql
# so all created_by/performed_by references resolve.
#
# Usage:
#   bash scripts/create-demo-users.sh
#
# Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
# IMPORTANT: never run the old demo-users.sql (manual auth.users insert) —
# it corrupts the auth schema ("Database error querying schema" on login).

set -euo pipefail

cd "$(dirname "$0")/.."

# Load .env.local
if [ ! -f .env.local ]; then
  echo "ERROR: .env.local not found"
  exit 1
fi

# shellcheck disable=SC1091
export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local | xargs)

if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env.local"
  exit 1
fi

PASSWORD="${DEMO_PASSWORD:-demo1234}"

create_user() {
  local id=$1 email=$2 name=$3
  echo -n "Creating $email ... "
  local resp code
  resp=$(curl -s -w "\n%{http_code}" --max-time 15 -X POST \
    "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"$id\",
      \"email\": \"$email\",
      \"password\": \"$PASSWORD\",
      \"email_confirm\": true,
      \"user_metadata\": {\"full_name\": \"$name\"}
    }")
  code=$(echo "$resp" | tail -1)
  if [ "$code" = "201" ] || [ "$code" = "200" ]; then
    echo "OK"
  else
    echo "FAILED (HTTP $code)"
    echo "$resp" | head -n -1 | head -c 300
    echo ""
  fi
}

create_user "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1" "admin@pln.co.id"    "Admin Utama"
create_user "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2" "staff1@pln.co.id"   "Budi Santoso"
create_user "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3" "staff2@pln.co.id"   "Siti Rahayu"
create_user "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4" "reviewer@pln.co.id" "Agus Wibowo"
create_user "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5" "approver@pln.co.id" "Dewi Kusuma"

echo ""
echo "Done. Login with any email above, password: $PASSWORD"
