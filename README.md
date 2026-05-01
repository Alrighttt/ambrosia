# Ambrosia

**Your scrapbook of the internet — owned by you, hosted on Sia.**

Live: <https://ambrosia-web.fly.dev/>
Demo video: [`ambrosia-demo.mp4`](ambrosia-demo.mp4) (3:22, 28 MB — included in this repo)

Paste any URL. Ambrosia extracts the media, the post text, the comments, even
the surrounding webpage when nothing else fits — and uploads it to your own
account on the Sia network. You end up with one library that pulls from every
platform, encrypted with a key only you hold, surviving long after the
original disappears.

## What you can archive

| Source | What gets saved |
|---|---|
| TikTok, Vimeo, Twitch clips | Video + audio + thumbnail |
| Instagram, Facebook, X (Twitter), Bluesky | Photo / video carousels with captions |
| Reddit posts | Media **plus** the post body and full comment tree |
| 190+ sites supported by `gallery-dl` | Albums, profiles, individual posts |
| Anything else | Static webpage snapshot — HTML, CSS, images bundled into a `sia-site` archive |

The library appears as a feed-style gallery. Tap a tile to open the viewer
(swipe / arrow keys to walk through carousel items, scroll up/down between
archives). Reddit threads open into an old-reddit-flavoured comment reader
sourced entirely from Sia.

## Why it's cool

- **The Sia SDK is load-bearing.** Every byte of every archive lives on Sia.
  Each archive is a packed upload of thumbnail + media + thread JSON + page
  snapshot files into shared slabs (~4× cheaper than per-object uploads).
  The browser holds the only key — losing it means losing access; recovering
  it from a 12-word phrase rebuilds the whole library.
- **Cross-device library sync from Sia alone.** With nothing but your recovery
  phrase, `syncLibraryFromSia` walks every `PinnedObject` you own, parses the
  metadata blob, groups by `sourceUrl`, and reconstructs the entire library
  from scratch. The local cache is just a cache — Sia is the source of truth.
- **Three extraction pipelines, automatically chosen per-URL.** Cobalt
  (server-side, clean URL → media URL), `gallery-dl` running in Pyodide
  inside the browser extension (residential IP, ~190 supported sites), and a
  generic webpage-snapshot fallback that captures the page itself when no
  extractor handles it.
- **Reddit, archived properly.** Post body, score, author, comment tree —
  all serialized to JSON, uploaded as a Sia object, and reconstructed in an
  old-reddit-style reader. Text-only posts get a Reddit-flavoured library
  tile that mimics a subreddit feed card.
- **Webpage snapshot = a `sia-site`.** When no extractor handles a URL
  (Wikipedia articles, blog posts, anything custom), we fetch the HTML and
  every linked asset via the extension, rewrite asset references to virtual
  paths, and upload the whole bundle behind a JSON manifest. The viewer
  reconstructs the page in a sandboxed iframe by mapping each virtual path
  back to a Sia share URL.

## Architecture

```
                ┌───────────────────────────────────────────────┐
                │   ambrosia-web/  (static SPA, fly.io)          │
                │   • Sia Storage SDK (WASM)                    │
                │   • orchestrates extraction → upload          │
                │   • feed UI, viewer, thread reader            │
                └─────┬───────────────┬───────────────┬─────────┘
                      │               │               │
        ┌─────────────▼───┐  ┌────────▼─────────┐  ┌──▼─────────────┐
        │ ambrosia-cobalt │  │ Browser ext.     │  │ sia.storage    │
        │ (fly.io)        │  │ (Chrome/FF)      │  │ (indexer +     │
        │ server-side     │  │ • residential IP │  │  Sia hosts;    │
        │ media extractor │  │   fetches        │  │  user's own    │
        │                 │  │ • gallery-dl in  │  │  account)      │
        │                 │  │   Pyodide        │  │                │
        │                 │  │ • YT extractor   │  │                │
        └─────────────────┘  └──────────────────┘  └────────────────┘
```

The browser is the orchestrator. Per URL it tries (in order) gallery-dl in
the extension, Cobalt, site-specific fallbacks (Reddit JSON API, Facebook
scraper), then a webpage snapshot. The chosen extractor returns one or more
media items; the browser fetches them through whichever transport works
(extension stream, direct fetch, Cobalt tunnel) and packs them into a single
Sia upload alongside scraped page metadata, the thread JSON when the source
is a comment platform, and a thumbnail.

## Repo layout

```
web/                   Static SPA — the user-facing app
  app.js               Library + viewer + upload orchestration (~3600 LOC)
  lib/                 SDK accessor, extractors (cobalt/reddit/facebook),
                       archive list, webpage snapshot, storage helpers
  setup/               First-run wizard — registers an app key with the indexer
  vendor/sia-storage/  Vendored Sia Storage SDK (WASM glue)

extension/             Chrome extension (Manifest V3)
firefox-extension/     Firefox extension (mostly mirrors Chrome; carries the
                       Pyodide bundle that runs gallery-dl in-browser)

cobalt/                Dockerfile + fly.toml for the self-hosted Cobalt instance
```

## Running it (judges, start here)

**Use Firefox.** Several extraction paths (Wikipedia snapshots,
Facebook scraping, the gallery-dl/Pyodide bundle) rely on the Firefox
companion extension to fetch with residential cookies.

The deployed app: <https://ambrosia-web.fly.dev/>.

### Step 1 — clone the repo

```sh
git clone https://github.com/Alrighttt/ambrosia.git
cd ambrosia
```

### Step 2 — load the Firefox extension

It's a Manifest V3 extension that hasn't been signed for AMO, so it has
to be loaded as a *temporary* add-on. Temporary add-ons stay loaded
until you quit Firefox; reload them on next launch the same way.

1. Open Firefox.
2. Paste this into the address bar and press Enter:

   <pre>about:debugging#/runtime/this-firefox</pre>

3. Click **Load Temporary Add-on…**.
4. In the file picker, navigate into the cloned repo's
   `firefox-extension/` directory and **select the file named
   `manifest.json`** (you pick the manifest file itself, not the
   directory).
5. The extension appears in the list as **"Ambrosia Companion (Firefox)"**.

### Step 3 — open the app

Open <https://ambrosia-web.fly.dev/> in the same Firefox profile.

- The page detects the extension automatically. The settings menu
  (⋯ in the top bar) shows the extension status.
- First visit walks you through the setup wizard — generate or paste a
  12-word recovery phrase. Ambrosia registers an app key with the
  public Sia indexer at `sia.storage`; that key is what owns every
  archive you make.
- Once setup completes, paste any URL in the ＋ button and click
  **Archive to Sia**. (Demo URLs will be communicated out of band.)

## Notes for judges

- Built April 29 – May 1 2026 for the Block Reward hackathon.
- **Use Firefox on desktop for archiving** — load the extension from
  `firefox-extension/`. Archiving on iOS / Android works too, but the
  mobile browsers can't load the companion extension so a few
  extraction paths (Wikipedia/Facebook snapshots, gallery-dl-only
  sites) won't run there.
- **iOS / Android make great library viewers.** Sign in on mobile with
  the same recovery phrase you used on desktop and "Re-fetch library
  from Sia" — every archive uploaded from any other browser on this
  account shows up. Worth signing in on both to feel the cross-device
  story: archive on desktop, read on the phone.
- All persistence lives on Sia. The browser localStorage is just a cache —
  delete it and your archives come back via "Re-fetch library from Sia"
  (↻ in the top bar).

## Local development

Serve `web/` and override the Cobalt URL in DevTools:

```sh
cd web && python3 -m http.server 8080
```

```js
// In the page's console:
localStorage.setItem('ambrosia.cobaltUrl', 'http://localhost:9000');
location.reload();
```

Cobalt itself, in another terminal:

```sh
docker run --rm -p 9000:9000 \
  -e API_URL=http://localhost:9000/ \
  -e CORS_WILDCARD=1 \
  ghcr.io/imputnet/cobalt:11
```

## Re-deploy

```sh
cd cobalt   && fly deploy
cd web      && fly deploy
```

## License

[MIT](LICENSE).
