# Installing the Ambrosia Firefox companion

Ambrosia the web app stays fully usable on its own at
https://ambrosia-web.fly.dev. This Firefox extension is a companion
layer that lets the web app prefer client-side fetches when they are
better than hitting Fly machines.

Current goals:

1. Let the web app fetch page HTML, JSON, thumbnails, and media bytes
   through the user’s own browser session.
2. Improve scraping for titles, captions, thumbnails, and Reddit-style
   structured JSON while keeping the base web app standalone.
3. Keep a clean path open for future login-required archiving, where the
   extension can run on the page and use the user’s real session.

## Load it in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**
3. Select [manifest.json](./manifest.json) from this directory.

Firefox forgets temporary add-ons on restart. For a permanent install,
this package would need signing and AMO distribution later.

## What this first version does

- Adds a floating `Save to Ambrosia` button on supported pages.
- Adds right-click `Save to Ambrosia` actions for links, images, videos,
  and the page itself.
- Injects a bridge into `ambrosia-web.fly.dev` so the web app can ask
  the extension for:
  - `fetch-text`
  - `fetch-json`
  - `fetch-bytes`
  - `fetch-stream`
- Keeps the app standalone: if the extension is missing, Ambrosia falls
  back to its normal browser/server behavior.

## Pixiv via gallery-dl

gallery-dl's Pixiv extractor uses Pixiv OAuth, not the browser's Pixiv
login cookies. Generate a refresh token locally:

```sh
gallery-dl oauth:pixiv
```

Open the Ambrosia extension popup, paste the refresh token into the
Pixiv OAuth field, and save it. After that, Pixiv artwork URLs such as
`https://www.pixiv.net/artworks/12345` can be archived through the
extension's gallery-dl path.

## Near-term direction

- Richer Reddit thread snapshots via client-side JSON fetches.
- Better authenticated scraping for sites that serve bot shells to Fly.
- More thumbnail/title/caption extraction from page context instead of
  server-side heuristics.
