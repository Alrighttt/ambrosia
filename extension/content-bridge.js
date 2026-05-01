// Bridge script. Lives on ambrosia-web.fly.dev pages and gives the web
// app two things:
//   1. A presence ping via window.postMessage so the page knows the
//      extension is installed (no chrome.* APIs are available to the
//      page itself in MV3).
//   2. A relay for context-menu clicks and right-click "Save to
//      Ambrosia" → web app receives an `ambrosia:archive-request` event.

const EXT_ID = chrome.runtime.id;

// Announce presence ASAP so the web app's bootstrap can detect us
// before it falls back to extension-less paths.
window.postMessage(
  { source: 'ambrosia-extension', type: 'present', extensionId: EXT_ID, version: chrome.runtime.getManifest().version },
  window.location.origin,
);

// Re-announce on requests from the page (in case our message arrived
// before the page set up its listener).
window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  if (e.data?.source !== 'ambrosia-page') return;
  if (e.data?.type === 'who-are-you') {
    window.postMessage(
      { source: 'ambrosia-extension', type: 'present', extensionId: EXT_ID, version: chrome.runtime.getManifest().version },
      window.location.origin,
    );
  }
});

// Background → page: forward "archive this URL" instructions delivered
// via the right-click menu when an Ambrosia tab is already open.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'ambrosia-archive' && msg.url) {
    window.postMessage(
      { source: 'ambrosia-extension', type: 'archive-request', url: msg.url },
      window.location.origin,
    );
  }
});
