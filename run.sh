#!/usr/bin/env bash
# =============================================================================
#  BreathNote — start everything with one command
#
#    ./run.sh                 # auto-detect the Arduino port
#    ./run.sh /dev/ttyACM0    # or give the port yourself
#
#  Starts:
#    0. the database      (Docker container "breathnote-db", if it exists)
#    1. the web app       (npm run dev    -> http://localhost:3000)
#    2. the sensor bridge (npm run bridge -> reads the Arduino over USB)
#
#  Press Ctrl+C once to stop the web app and the bridge.
#  (The database container is left running; stop it with: docker stop breathnote-db)
#
#  Optional environment variables:
#    BAUD=9600                 serial baud rate (must match the Arduino sketch)
#    SCALE=50000               raw counts per kPa (sensitivity of the balls)
#    DB_CONTAINER=breathnote-db  name of the PostgreSQL Docker container
# =============================================================================

set -u
cd "$(dirname "$0")"

BAUD="${BAUD:-9600}"
SCALE="${SCALE:-50000}"
DB_CONTAINER="${DB_CONTAINER:-breathnote-db}"
PORT_ARG="${1:-${SERIAL_PORT:-}}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
info() { echo -e "${BLUE}[run]${NC} $*"; }
ok()   { echo -e "${GREEN}[run]${NC} $*"; }
warn() { echo -e "${YELLOW}[run]${NC} $*"; }
err()  { echo -e "${RED}[run]${NC} $*"; }

# ---------- checks -----------------------------------------------------------
if ! command -v npm >/dev/null 2>&1; then
  err "npm is not installed (or not on PATH). Install Node.js 18+ first."
  exit 1
fi

if [ ! -f .env ]; then
  warn ".env file not found — the app needs DATABASE_URL and JWT_SECRET (see README.md)."
fi

if [ ! -d node_modules ]; then
  info "Installing dependencies (first run only)..."
  npm install || { err "npm install failed"; exit 1; }
fi

# ---------- 0. database (Docker) ---------------------------------------------
if command -v docker >/dev/null 2>&1 && docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  if [ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER")" != "true" ]; then
    info "Starting the database container ($DB_CONTAINER)..."
    docker start "$DB_CONTAINER" >/dev/null || { err "Could not start $DB_CONTAINER"; exit 1; }
  fi
  info "Waiting for the database to be ready..."
  for _ in $(seq 1 30); do
    docker exec "$DB_CONTAINER" pg_isready -q >/dev/null 2>&1 && break
    sleep 1
  done
  if docker exec "$DB_CONTAINER" pg_isready -q >/dev/null 2>&1; then
    ok "Database is ready."
  else
    warn "Database did not become ready in 30 s — the app may show database errors."
  fi
else
  warn "Docker container '$DB_CONTAINER' not found — make sure your database (DATABASE_URL in .env) is running."
fi

# ---------- find the Arduino serial port --------------------------------------
find_port() {
  if [ -n "$PORT_ARG" ]; then echo "$PORT_ARG"; return; fi
  for p in /dev/ttyACM* /dev/ttyUSB* /dev/cu.usbmodem* /dev/cu.usbserial*; do
    [ -e "$p" ] && { echo "$p"; return; }
  done
}

# ---------- stop everything on Ctrl+C ----------------------------------------
# Kill a process and all of its children (npm -> node -> next ...).
kill_tree() {
  local pid=$1 child
  for child in $(pgrep -P "$pid" 2>/dev/null); do kill_tree "$child"; done
  kill -TERM "$pid" 2>/dev/null
}
cleanup() {
  trap - INT TERM
  echo
  info "Stopping BreathNote..."
  for child in $(pgrep -P $$ 2>/dev/null); do kill_tree "$child"; done
  sleep 1
  for child in $(pgrep -P $$ 2>/dev/null); do kill -KILL "$child" 2>/dev/null; done
  ok "Stopped. (Database container '$DB_CONTAINER' is still running; stop it with: docker stop $DB_CONTAINER)"
  exit 0
}
trap cleanup INT TERM

# ---------- 1. web app -------------------------------------------------------
info "Starting the web app..."
npm run dev 2>&1 | sed -u "s/^/$(printf "${GREEN}[web]${NC} ")/" &


# ---------- 2. sensor bridge (waits for the Arduino, restarts if unplugged) ---
bridge_loop() {
  local warned=0
  while true; do
    local port
    port="$(find_port)"
    if [ -z "$port" ]; then
      if [ $warned -eq 0 ]; then
        warn "Waiting for the Arduino... plug it in via USB (checking every 2 s)."
        warned=1
      fi
      sleep 2
      continue
    fi
    warned=0

    if [ ! -r "$port" ] || [ ! -w "$port" ]; then
      err "No permission to open $port."
      err "Fix once with:  sudo usermod -aG dialout \$USER   (then log out and log in again)"
      err "Or for this session only:  sudo chmod a+rw $port"
      sleep 5
      continue
    fi

    ok "Arduino found on $port — starting the bridge (do NOT breathe for the first 3 seconds: zero calibration)."
    npm run bridge -- --port "$port" --baud "$BAUD" --scale "$SCALE"
    warn "Bridge stopped (Arduino unplugged or error). Retrying in 2 s..."
    sleep 2
  done
}
bridge_loop 2>&1 | sed -u "s/^/$(printf "${YELLOW}[sensor]${NC} ")/" &


sleep 1
echo
ok "BreathNote is starting."
ok "Open  http://localhost:3000  in Chrome.   Press Ctrl+C to stop everything."
echo

wait
