#!/bin/sh
# Wrapper that fetches the latest YouTube cookies from our cookie service
# before launching Cobalt. Without authenticated YouTube cookies, fly.io
# IPs hit YouTube's bot-detection wall and Cobalt returns
# `error.api.youtube.login` for every video. The cookie service
# (ambrosia-yt-cookies) maintains a logged-in Chromium profile on a fly
# volume and refreshes its tokens every few hours.
#
# Cobalt watches COOKIE_PATH for changes, but a full machine restart is
# the simplest way to ensure picked-up changes — fly auto-stops and
# auto-starts this machine when idle, so each cold-start fetches fresh
# cookies organically.
set -e

COOKIE_URL="${COOKIE_URL:-https://ambrosia-yt-cookies.fly.dev/cookies.json}"
COOKIE_PATH="${COOKIE_PATH:-/cookies.json}"

echo "[cobalt-entrypoint] fetching cookies from ${COOKIE_URL} -> ${COOKIE_PATH}"

# Try a few times — the cookie service auto-stops and may take a few
# seconds to wake up on first cold start.
i=0
while [ $i -lt 6 ]; do
    if curl -sSf -o "${COOKIE_PATH}.tmp" "${COOKIE_URL}"; then
        # Sanity check: parse as JSON and verify a youtube entry exists.
        if node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if(!d.youtube||!d.youtube.length) process.exit(1)" "${COOKIE_PATH}.tmp" 2>/dev/null; then
            mv "${COOKIE_PATH}.tmp" "${COOKIE_PATH}"
            echo "[cobalt-entrypoint] cookies fetched ok"
            break
        else
            echo "[cobalt-entrypoint] cookies file invalid (sidecar may not be bootstrapped yet), retrying"
        fi
    else
        echo "[cobalt-entrypoint] cookie fetch attempt $i failed, retrying"
    fi
    rm -f "${COOKIE_PATH}.tmp"
    i=$((i + 1))
    sleep 3
done

if [ ! -f "${COOKIE_PATH}" ]; then
    echo "[cobalt-entrypoint] WARNING: starting Cobalt without YouTube cookies — most videos will return error.api.youtube.login"
fi

# Cobalt's default entrypoint.
exec node src/cobalt
