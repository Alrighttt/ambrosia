FROM ghcr.io/imputnet/cobalt:11

# Cobalt reads its config from env. fly.toml sets API_URL and the
# CORS allowlist so only the web app's origin can hit it.
EXPOSE 9000

# entrypoint.sh fetches a fresh YouTube cookie set from the
# ambrosia-yt-cookies sidecar before launching Cobalt. Without it, fly.io
# IPs hit YouTube's bot-detection wall and most videos return
# error.api.youtube.login. The base image is node:24-alpine; install
# curl as root then drop back to the unprivileged node user.
USER root
RUN apk add --no-cache curl
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chown node:node /entrypoint.sh

# Temporary debug: log the actual error message + .info JSON when
# youtubei.js's getBasicInfo throws. Cobalt's source maps every failure
# to "video.unavailable" / "youtube.login" without surfacing the
# underlying YouTube response, which makes diagnosis from the outside
# impossible. Patch is idempotent and a single line.
RUN sed -i 's|if (e?.message === "This video is unavailable") {|console.log("[debug-yt] getBasicInfo threw:", JSON.stringify({msg:e?.message,info:e?.info,name:e?.name})); if (e?.message === "This video is unavailable") {|' /app/src/processing/services/youtube.js
USER node

CMD ["/entrypoint.sh"]
