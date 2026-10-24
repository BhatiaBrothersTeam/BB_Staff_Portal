#!/usr/bin/env bash
# Runs a local Keycloak in dev mode on http://localhost:8080 with the "staff"
# realm from staff-realm.json. Secrets come from the portal's .env.local, so
# the client secret Keycloak expects always matches KEYCLOAK_CLIENT_SECRET.
#
#   KEYCLOAK_HOME=/path/to/keycloak-26.8.1 keycloak/start-dev.sh
#
# Dev mode only: in-memory-style H2 storage, plain HTTP. Not for production.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
repo="$(dirname "$here")"
KEYCLOAK_HOME="${KEYCLOAK_HOME:-$(dirname "$repo")/keycloak-26.8.1}"

if [[ ! -x "$KEYCLOAK_HOME/bin/kc.sh" ]]; then
  echo "Keycloak not found at $KEYCLOAK_HOME. Set KEYCLOAK_HOME." >&2
  exit 1
fi

env_value() { grep -E "^$1=" "$repo/.env.local" | tail -1 | cut -d= -f2-; }

export KC_PORTAL_URL="$(env_value PORTAL_URL)"
export KC_PORTAL_CLIENT_SECRET="$(env_value KEYCLOAK_CLIENT_SECRET)"
export KC_TEST_USER_PASSWORD="$(env_value KC_TEST_USER_PASSWORD)"
export KC_BOOTSTRAP_ADMIN_USERNAME=admin
export KC_BOOTSTRAP_ADMIN_PASSWORD="$(env_value KC_ADMIN_PASSWORD)"

mkdir -p "$KEYCLOAK_HOME/data/import"
cp "$here/staff-realm.json" "$KEYCLOAK_HOME/data/import/staff-realm.json"

exec "$KEYCLOAK_HOME/bin/kc.sh" start-dev --http-port=8080 --import-realm
