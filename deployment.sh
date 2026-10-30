#!/usr/bin/env bash
set -euo pipefail

PI_HOST="${PI_HOST:-luke-kano.local}"
PI_USER="${PI_USER:-homehub}"
REPO_URL="https://github.com/alanmathew/kano-home-hub.git"
REMOTE_DIR="/home/homehub/kano-home-hub"
SERVICE_NAME="kano-home-hub"

echo "========================================"
echo "  Kano Home Hub Deployment"
echo "========================================"
echo "Target: ${PI_USER}@${PI_HOST}"
echo "Enter the Pi's SSH password when prompted."
echo

ssh \
    -o PreferredAuthentications=keyboard-interactive,password \
    -o NumberOfPasswordPrompts=3 \
    "${PI_USER}@${PI_HOST}" bash -s <<'REMOTE'
set -euo pipefail

REPO_URL="https://github.com/alanmathew/kano-home-hub.git"
REMOTE_DIR="/home/homehub/kano-home-hub"
VENV_DIR="$REMOTE_DIR/venv"
SERVICE_NAME="kano-home-hub"

echo "==> Connected to Kano"

if [ ! -d "$REMOTE_DIR/.git" ]; then
    echo "==> First deployment: cloning repository"
    git clone "$REPO_URL" "$REMOTE_DIR"
fi

cd "$REMOTE_DIR"

echo "==> Pulling latest code"
git pull --ff-only origin main

if [ ! -d "$VENV_DIR" ]; then
    echo "==> Creating Python virtual environment"
    python3 -m venv "$VENV_DIR"
fi

echo "==> Installing dependencies"
"$VENV_DIR/bin/pip" install -r requirements.txt

if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "NOTICE: Luke’s View requires ffmpeg; install it with: sudo apt install ffmpeg"
fi

if systemctl list-unit-files 2>/dev/null | grep -q "^${SERVICE_NAME}\.service"; then
    echo "==> Restarting Home Hub service"
    sudo systemctl restart "$SERVICE_NAME"
    sudo systemctl --no-pager --full status "$SERVICE_NAME" | head -n 15
else
    echo "==> systemd service not configured yet"
    echo "==> Starting Flask in the background"

    if ! command -v fuser >/dev/null 2>&1; then
        echo "ERROR: fuser is required to safely clear port 6001." >&2
        echo "Install it on the Kano with: sudo apt install psmisc" >&2
        exit 1
    fi

    echo "==> Stopping any process listening on port 6001"
    fuser -k -TERM 6001/tcp 2>/dev/null || true

    for attempt in 1 2 3 4 5; do
        if ! fuser 6001/tcp >/dev/null 2>&1; then
            break
        fi
        sleep 1
    done

    if fuser 6001/tcp >/dev/null 2>&1; then
        echo "==> Process did not stop; forcing it to exit"
        fuser -k -KILL 6001/tcp 2>/dev/null || true
        sleep 1
    fi

    if fuser 6001/tcp >/dev/null 2>&1; then
        echo "ERROR: port 6001 is still in use; refusing to start another copy." >&2
        exit 1
    fi

    nohup "$VENV_DIR/bin/python" "$REMOTE_DIR/app.py" \
        > "$REMOTE_DIR/home-hub.log" 2>&1 &

    sleep 2

    echo "==> Home Hub started"
    echo "==> Log: $REMOTE_DIR/home-hub.log"
fi

echo
echo "==> Deployment complete"
echo "==> Open on Kano: http://localhost:6001"
REMOTE

echo
echo "========================================"
echo " Deployment finished successfully"
echo "========================================"
