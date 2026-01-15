#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:6868}"
BASE_URL="${BASE_URL%/}"

usage() {
  cat <<EOF
Usage: $(basename "$0") <base_url>

Examples:
  $(basename "$0") http://127.0.0.1:6868
  $(basename "$0") http://192.168.x.x:6868
  $(basename "$0") https://<your-render-service>

What it checks:
  - GET /healthz (must succeed)
  - GET / (must be HTTP 200)
  - Socket.IO polling handshake (must contain a sid)
  - GET /ws (best-effort; expected to require WebSocket upgrade)
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

echo "[smoke] base: $BASE_URL"

echo "[smoke] GET /healthz"
HEALTH_JSON="$(curl -fsS "$BASE_URL/healthz")"
echo "  ok: $(echo "$HEALTH_JSON" | head -c 120)"

echo "[smoke] GET / (status)"
HTTP_CODE="$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/")"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "  expected 200, got $HTTP_CODE"
  exit 1
fi

echo "  ok: 200"

echo "[smoke] Socket.IO polling handshake"
T="$(date +%s)"
SIO="$(curl -fsS "$BASE_URL/socket.io/?EIO=4&transport=polling&t=$T")"
if echo "$SIO" | grep -q '"sid"'; then
  echo "  ok: sid present"
else
  echo "  failed: response did not contain sid"
  echo "  first bytes: $(echo "$SIO" | head -c 200)"
  exit 1
fi

echo "[smoke] GET /ws (best-effort)"
# /ws is a WebSocket endpoint; a plain HTTP GET is expected to fail with 400/426.
WS_CODE="$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/ws" || true)"
case "$WS_CODE" in
  400|426|404)
    echo "  ok-ish: got HTTP $WS_CODE (expected without Upgrade)"
    ;;
  200)
    echo "  warning: got HTTP 200; /ws may not be a WS endpoint on this deploy"
    ;;
  *)
    echo "  note: got HTTP $WS_CODE"
    ;;
esac

echo "[smoke] done"
