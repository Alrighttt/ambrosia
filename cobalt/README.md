# Self-hosted Cobalt for Ambrosia

This is the deployment config for Ambrosia's Cobalt instance. Cobalt does the
URL → media-stream extraction; Ambrosia uploads the result to Sia.

## Deploy

```sh
cd cobalt
fly launch --copy-config --no-deploy   # first time only, accept defaults; app name "ambrosia-cobalt"
fly deploy
```

After deploy, the API is at `https://ambrosia-cobalt.fly.dev/`. The web app
points at this URL by default via [`web/lib/constants.js`](../web/lib/constants.js).
Override per-browser by setting `localStorage.setItem('ambrosia.cobaltUrl', '<url>')`.

## Configuration

`fly.toml` sets the env vars Cobalt expects:

- `API_URL` — externally-reachable URL of this instance. Used in tunnel responses.
- `CORS_URL` — origin that's allowed to call the API. Set to the web app's
  origin so only Ambrosia clients can use it.
- `RATELIMIT_WINDOW` / `RATELIMIT_MAX` — token-bucket sizing. Bump if abuse becomes
  an issue.

For a fully locked-down deploy (API key required), see Cobalt's
[API key docs](https://github.com/imputnet/cobalt/blob/main/docs/protect-an-instance.md)
and add `API_KEY_URL` + `JWT_SECRET` to the env block.

## Local

```sh
docker run --rm -p 9000:9000 \
  -e API_URL=http://localhost:9000/ \
  -e CORS_WILDCARD=1 \
  ghcr.io/imputnet/cobalt:11
```

Then point the web app at `http://localhost:9000` via the localStorage override
above.
