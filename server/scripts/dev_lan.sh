#!/usr/bin/env bash
set -euo pipefail

# LAN dev helper for 1wlgame server
# - Binds to 0.0.0.0 so phones on same Wi-Fi can access
# - Writes pid/log to /tmp for easy management

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-6868}"
MODE="${MODE:-dev}" # dev|start
PID_FILE="${PID_FILE:-/tmp/1wlgame${PORT}.lan.pid}"
LOG_FILE="${LOG_FILE:-/tmp/1wlgame${PORT}.lan.log}"
FORCE_PORT_KILL="${FORCE_PORT_KILL:-0}"

usage() {
  cat <<EOF
Usage: $(basename "$0") <start|stop|restart|status|logs|url>

Env overrides:
  HOST=0.0.0.0   Bind host (default 0.0.0.0)
  PORT=6868      Bind port (default 6868)
  MODE=dev|start npm script to run (default dev)
  PID_FILE=...   PID file path (default /tmp/1wlgame<PORT>.lan.pid)
  LOG_FILE=...   Log file path (default /tmp/1wlgame<PORT>.lan.log)
  FORCE_PORT_KILL=1  If the port is already in use, kill the listener and proceed

Examples:
  ./scripts/dev_lan.sh start
  ./scripts/dev_lan.sh logs
  ./scripts/dev_lan.sh stop
EOF
}

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

lan_ip() {
  # macOS: try to get IP for default route interface first
  local iface ip
  iface="$(route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}')"
  if [[ -n "${iface:-}" ]]; then
    ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
    if [[ -n "${ip:-}" ]]; then
      echo "$ip"
      return 0
    fi
  fi

  # Fallback common Wi-Fi interfaces
  ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
  [[ -n "${ip:-}" ]] && { echo "$ip"; return 0; }
  ip="$(ipconfig getifaddr en1 2>/dev/null || true)"
  [[ -n "${ip:-}" ]] && { echo "$ip"; return 0; }

  # Last fallback: parse from ifconfig
  ifconfig 2>/dev/null | awk '
    $1 ~ /^en[0-9]+:$/ {iface=$1}
    $1 == "inet" && $2 != "127.0.0.1" {print $2; exit}
  ' | tr -d '\n'
}

do_start() {
  if is_running; then
    echo "Already running (pid=$(cat "$PID_FILE"))"
    do_url
    return 0
  fi

  mkdir -p "$ROOT_DIR/scripts" >/dev/null 2>&1 || true

  # If the port is already in use, do not kill by default (avoid accidental kills).
  local lp
  lp="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)"
  if [[ -n "${lp:-}" ]]; then
    if [[ "$FORCE_PORT_KILL" == "1" ]]; then
      echo "Port ${PORT} is busy (pid=${lp}); FORCE_PORT_KILL=1 so stopping it..."
      kill -TERM "$lp" 2>/dev/null || true
      sleep 0.2
      kill -0 "$lp" 2>/dev/null && kill -KILL "$lp" 2>/dev/null || true
      sleep 0.2
    else
      echo "Port ${PORT} is already in use (pid=${lp})."
      echo "Refusing to kill it by default."
      echo "Use: FORCE_PORT_KILL=1 $(basename "$0") start"
      exit 3
    fi
  fi

  echo "Starting 1wlgame on ${HOST}:${PORT}..."
  (
    cd "$ROOT_DIR"
    nohup env HOST="$HOST" PORT="$PORT" npm run "$MODE" >"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
  )

  # Wait for the port to be ready (avoid flaky immediate curls)
  local i
  for i in {1..30}; do
    if ! is_running; then
      echo "Failed to start (process exited). Last logs:"
      tail -n 120 "$LOG_FILE" || true
      exit 1
    fi
    if curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1; then
      echo "Started (pid=$(cat "$PID_FILE"))"
      do_url
      return 0
    fi
    sleep 0.15
  done

  echo "Started process, but server not responding yet. Last logs:"
  tail -n 120 "$LOG_FILE" || true
  exit 1
}

do_stop() {
  if ! [[ -f "$PID_FILE" ]]; then
    echo "Not running (no pid file: $PID_FILE)"
    return 0
  fi
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -z "${pid:-}" ]]; then
    rm -f "$PID_FILE" || true
    echo "Not running (empty pid file)"
    return 0
  fi
  if kill -0 "$pid" 2>/dev/null; then
    echo "Stopping pid=$pid ..."
    kill "$pid" 2>/dev/null || true
    sleep 0.2
    kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE" || true
  echo "Stopped"
}

do_status() {
  if is_running; then
    echo "Running (pid=$(cat "$PID_FILE"))"
    do_url
  else
    echo "Not running"
  fi
}

do_logs() {
  if [[ -f "$LOG_FILE" ]]; then
    tail -n 120 "$LOG_FILE" | cat
  else
    echo "No log file: $LOG_FILE"
  fi
}

do_url() {
  local ip
  ip="$(lan_ip || true)"
  echo "Local: http://127.0.0.1:${PORT}/"
  if [[ -n "${ip:-}" ]]; then
    echo "LAN  : http://${ip}:${PORT}/"
  else
    echo "LAN  : (could not detect LAN IP)"
  fi
}

cmd="${1:-}"
case "$cmd" in
  start) do_start ;;
  stop) do_stop ;;
  restart) do_stop; do_start ;;
  status) do_status ;;
  logs) do_logs ;;
  url) do_url ;;
  -h|--help|help|"") usage; exit 0 ;;
  *) echo "Unknown command: $cmd"; usage; exit 2 ;;
esac
