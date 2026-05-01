# Installing the Ambrosia extension

While Ambrosia itself works fine as a standalone web app at
https://ambrosia-web.fly.dev, the extension unlocks two things the web
app can't do alone:

1. **gallery-dl coverage.** ~190 sites (Wikipedia/Commons, Pixiv,
   DeviantArt, Twitter, etc.) extract via gallery-dl running in
   Pyodide inside the extension. Cobalt can't run that path itself.
2. **One-click "Save to Ambrosia"** on every supported site (TikTok,
   Instagram, X, Reddit, etc.) plus right-click on any image, video,
   or link.

## Chrome / Edge / Brave / Arc

1. Open `chrome://extensions/` (or the equivalent for your browser).
2. Toggle **Developer mode** in the top-right.
3. Click **Load unpacked**.
4. Select this `extension/` directory.
5. Pin the Ambrosia icon to your toolbar (puzzle-piece menu → pin).

To update later: change files locally and click the "reload" icon on
the extension card.

## Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `manifest.json` inside this directory.

Firefox forgets the extension on browser restart in this mode — for
permanent install we'd need to sign and publish to AMO.

## Verifying it works

1. Click the Ambrosia icon in your toolbar — the popup should show
   `Web app: reachable` and your library count.
2. Open any TikTok video / Instagram post / Reddit thread — a
   `📚 Save to Ambrosia` button should appear in the bottom-right
   corner of the page.
3. Click it. Ambrosia should focus / open with the URL pre-filled and
   start archiving.

## Troubleshooting

- **"Save to Ambrosia" button doesn't appear** → reload the page
  after installing.
- **Popup says "Web app: unreachable"** → check your network; the web
  app at https://ambrosia-web.fly.dev should respond to a normal
  browser visit.
