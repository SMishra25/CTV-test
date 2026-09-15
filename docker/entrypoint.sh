#!/usr/bin/env bash
set -euo pipefail

SCREEN_GEOMETRY="${SCREEN_GEOMETRY:-1920x1080x24}"
NOVNC_PORT="${NOVNC_PORT:-7900}"
VNC_PORT="${VNC_PORT:-5900}"
DISPLAY_NUM="${DISPLAY:-:99}"

echo "[ctv] starting Xvfb on ${DISPLAY_NUM} (${SCREEN_GEOMETRY})"
Xvfb "${DISPLAY_NUM}" -screen 0 "${SCREEN_GEOMETRY}" -ac +extension RANDR +extension GLX >/tmp/xvfb.log 2>&1 &

# Wait for the X display socket to be ready.
for _ in $(seq 1 50); do
  if xdpyinfo -display "${DISPLAY_NUM}" >/dev/null 2>&1; then break; fi
  sleep 0.1
done

echo "[ctv] starting window manager"
export DISPLAY="${DISPLAY_NUM}"
xsetroot -solid "#2e2e2e" 2>/dev/null || true
mkdir -p /root/.fluxbox
cp /opt/runner/fluxbox/init /root/.fluxbox/init
fluxbox >/tmp/fluxbox.log 2>&1 &

echo "[ctv] starting x11vnc on :${VNC_PORT}"
x11vnc -display "${DISPLAY_NUM}" -nopw -forever -shared -rfbport "${VNC_PORT}" -bg -quiet

NOVNC_WEB="/usr/share/novnc"
if [ ! -f "${NOVNC_WEB}/vnc.html" ] && [ -d /usr/share/webapps/novnc ]; then
  NOVNC_WEB="/usr/share/webapps/novnc"
fi

echo "[ctv] starting noVNC (websockify) on :${NOVNC_PORT}"
websockify --web "${NOVNC_WEB}" "${NOVNC_PORT}" "localhost:${VNC_PORT}" >/tmp/websockify.log 2>&1 &

# Chromium binds CDP to 127.0.0.1; socat re-exposes it on 0.0.0.0 for Docker port publish.
INTERNAL_DEBUG_PORT="${INTERNAL_DEBUG_PORT:-9223}"
DEBUG_PROXY_PORT="${DEBUG_PROXY_PORT:-9222}"
echo "[ctv] starting CDP proxy ${DEBUG_PROXY_PORT} -> 127.0.0.1:${INTERNAL_DEBUG_PORT}"
socat "TCP-LISTEN:${DEBUG_PROXY_PORT},fork,bind=0.0.0.0,reuseaddr" "TCP:127.0.0.1:${INTERNAL_DEBUG_PORT}" >/tmp/socat-debug.log 2>&1 &
export REMOTE_DEBUG_PORT="${INTERNAL_DEBUG_PORT}"

echo "[ctv] resolving + launching browser"
exec node resolve-and-launch.mjs
