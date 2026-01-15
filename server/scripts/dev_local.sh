#!/usr/bin/env bash
set -euo pipefail

# Local dev helper for 1wlgame server (port 6868 by default)
# - Manages a background process via pid/log files
# - Safer than dev_lan.sh by default: will NOT kill an unknown process that already uses the port
#   unless FORCE_PORT_KILL=1 is set.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-6868}"
MODE="${MODE:-dev}" # dev|start

PID_FILE="${PID_FILE:-/tmp/1wlgame${PORT}.local.pid}"
LOG_FILE="${LOG_FILE:-/tmp/1wlgame${PORT}.local.log}"
FORCE_PORT_KILL="${FORCE_PORT_KILL:-0}"

usage() {
  cat <<EOF
Usage: $(basename "$0") <start|stop|restart|status|logs|url>

Defaults:
  HOST=$HOST
  PORT=$PORT
  MODE=$MODE
  PID_FILE=$PID_FILE
  LOG_FILE=$LOG_FILE

Env overrides:
  HOST=127.0.0.1       Bind host (default 127.0.0.1)
  PORT=6868            Bind port (default 6868)
  MODE=dev|start       npm script to run (default dev)
  PID_FILE=...         PID file path
  LOG_FILE=...         Log file path
  FORCE_PORT_KILL=1    If the port is already in use, kill the listener and proceed

Examples:
  ./scripts/dev_local.sh start
  ./scripts/dev_local.sh status
  ./scripts/dev_local.sh logs
  ./scripts/dev_local.sh stop

  # If port 6868 is already used by another process:
  FORCE_PORT_KILL=1 ./scripts/dev_local.sh restart
EOF
}

port_listener_pid() {
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true
}

is_pid_running() {
  local pid="$1"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

is_managed_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  is_pid_running "$pid"
}

wait_port_down() {
  local i
  for i in {1..80}; do
    if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      sleep 0.1
    else
      return 0
    fi
  done
  return 1
}

wait_port_up() {
  local i
  for i in {1..80}; do
    if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.1
  done
  return 1
}

do_url() {
  echo "Local: http://127.0.0.1:${PORT}/"
}

do_status() {
  if is_managed_running; then
    echo "Running (managed pid=$(cat "$PID_FILE"))"
    do_url
    return 0
  fi

  local lp
  lp="$(port_listener_pid)"
  if [[ -n "$lp" ]]; then
    echo "Port ${PORT} is in use by pid=${lp} (not managed by $PID_FILE)"
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN | head || true
    return 2
  fi

  echo "Not running"
}

do_logs() {
  if [[ -f "$LOG_FILE" ]]; then
    tail -n 200 "$LOG_FILE" | cat
  else
    echo "No log file: $LOG_FILE"
  fi
}

do_start() {
  if is_managed_running; then
    echo "Already running (pid=$(cat "$PID_FILE"))"
    do_url
    return 0
  fi

  local lp
  lp="$(port_listener_pid)"
  if [[ -n "$lp" ]]; then
    if [[ "$FORCE_PORT_KILL" == "1" ]]; then
      echo "Port ${PORT} is busy (pid=${lp}); FORCE_PORT_KILL=1 so stopping it..."
      kill -TERM "$lp" 2>/dev/null || true
      wait_port_down || {
        echo "Port ${PORT} still busy; sending SIGKILL..."
        kill -KILL "$lp" 2>/dev/null || true
        wait_port_down || true
      }
    else
      echo "Port ${PORT} is already in use (pid=${lp})."
      echo "Refusing to kill it by default."
      echo "Use: FORCE_PORT_KILL=1 $(basename "$0") start"
      exit 3
    fi
  fi

  echo "Starting 1wlgame (${MODE}) on ${HOST}:${PORT} ..."
  (
    cd "$ROOT_DIR"
    nohup env HOST="$HOST" PORT="$PORT" npm run "$MODE" >"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
  )

  if ! wait_port_up; then
    echo "Failed to bind port ${PORT}. Last logs:"
    tail -n 200 "$LOG_FILE" || true
    exit 1
  fi

  # Best-effort health check
  if curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1; then
    echo "Started (pid=$(cat "$PID_FILE"))"
    do_url
    return 0
  fi

  echo "Started process, but /healthz not responding yet. Last logs:"
  tail -n 200 "$LOG_FILE" || true
  return 0
}

do_stop() {
  if is_managed_running; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    echo "Stopping managed pid=$pid ..."
    kill -TERM "$pid" 2>/dev/null || true
    sleep 0.2
    if is_pid_running "$pid"; then
      kill -KILL "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE" || true
    wait_port_down || true
    echo "Stopped"
    return 0
  fi

  if [[ "$FORCE_PORT_KILL" == "1" ]]; then
    local lp
    lp="$(port_listener_pid)"
    if [[ -n "$lp" ]]; then
      echo "Stopping port listener pid=$lp (FORCE_PORT_KILL=1) ..."
      kill -TERM "$lp" 2>/dev/null || true
      wait_port_down || true
      echo "Stopped"
      return 0
    fi
  fi

  echo "Not running (no managed pid at $PID_FILE)."
  echo "Tip: run 'status' to see if the port is in use by another process."
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
