# Ambrosia — demo script (~90 seconds)

Goal: show what it does, why it's cool, and that the Sia SDK is doing real
work. Keep narration tight; let the UI speak.

## Setup before recording

- Fresh Firefox profile with the Ambrosia extension already loaded
  (`about:debugging` → Load Temporary Add-on → `firefox-extension/manifest.json`).
- Open <https://ambrosia-web.fly.dev/> and complete setup once before recording.
  Have a few archives already in the library so it doesn't open empty.
- Have these URLs ready in a clipboard manager / scratch tab:
  1. `https://www.tiktok.com/@…/<short-video>` (any TikTok)
  2. `https://www.reddit.com/r/<sub>/comments/…` (a thread with media + comments)
  3. `https://en.wikipedia.org/wiki/Content-addressable_storage` (webpage snapshot)

## Shot list

### 0:00–0:08 — opening hook
- Visible: the Ambrosia library page, populated tiles.
- Voice: "Ambrosia is a personal web archiver. Paste any URL, and it saves
  the media — videos, photos, comments, even the surrounding webpage — to
  your own account on the Sia network."

### 0:08–0:25 — single-URL archive
- Click ＋ FAB → paste TikTok URL → Archive.
- Show the progress strip: "Extracting via gallery-dl…" → "Packing into
  Sia…" → bytes shipped / shards / hosts ticking up.
- When done it auto-jumps into the viewer.
- Voice: "Pasted a TikTok URL. Ambrosia chose its extractor automatically —
  here it's gallery-dl running inside the browser extension — fetched the
  video and uploaded it to Sia in one packed batch."

### 0:25–0:45 — Reddit, archived properly
- Back in library. ＋ → paste Reddit thread URL.
- Wait for the upload, click into the new tile.
- Show the carousel walk: media slide → click right arrow → thread slide
  with the post card.
- Click the post card → thread reader opens with comments.
- Voice: "Reddit threads come with their comments. The whole post body
  and comment tree get serialized to JSON and uploaded as a Sia object,
  rendered in an old-reddit-flavoured reader sourced entirely from Sia."

### 0:45–1:05 — webpage snapshot fallback
- ＋ → paste a Wikipedia URL.
- Voice (over the upload progress): "Some URLs no extractor handles.
  Ambrosia falls back to capturing the page itself — the HTML, the
  stylesheets, the images — bundled as a `sia-site` archive."
- Open the resulting tile → click the snapshot card → page loads in a
  sandboxed iframe sourced from Sia.

### 1:05–1:25 — sync from Sia, the killer demo
- Open a private window. Visit ambrosia-web.fly.dev.
- Run the setup wizard with the SAME 12-word recovery phrase.
- The empty library opens. Click the ↻ button.
- Watch the library rebuild itself from Sia.
- Voice: "Everything you saw lives on Sia, owned by your app key. Open
  Ambrosia from any browser with your recovery phrase and the library
  rebuilds itself — Ambrosia just walks every pinned object you own,
  reads the metadata, and reconstructs the whole feed."

### 1:25–1:30 — outro
- Cut back to the populated library.
- Voice: "Built in three days for the Block Reward hackathon, Sia SDK
  load-bearing throughout."

## Tips
- Pre-warm the connection by archiving once before recording — first
  upload of a session pays SDK-init latency.
- Prefer a Reddit thread that's already small (< 300 comments) so the
  thread reader scrolls cleanly on screen.
- If a Sia upload pauses mid-way ("paused 30s — Sia hosts negotiating…"),
  cut to the viewer of an already-archived item rather than waiting on
  camera.
