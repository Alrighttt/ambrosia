// Background service worker. Two responsibilities:
//   1. Streaming media bytes from CDN URLs to the web app (extension
//      host_permissions let us bypass CORS), and fetching HTML / JSON /
//      bytes via the user's logged-in residential-IP session.
//   2. Right-click context menu → "Save to Ambrosia".

const AMBROSIA_WEB = 'https://ambrosia-web.fly.dev';

// ───────────────────── Right-click context menu ─────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ambrosia-save-link',
    title: 'Save link to Ambrosia',
    contexts: ['link'],
  });
  chrome.contextMenus.create({
    id: 'ambrosia-save-image',
    title: 'Save image to Ambrosia',
    contexts: ['image'],
  });
  chrome.contextMenus.create({
    id: 'ambrosia-save-video',
    title: 'Save video to Ambrosia',
    contexts: ['video'],
  });
  chrome.contextMenus.create({
    id: 'ambrosia-save-page',
    title: 'Save this page to Ambrosia',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let url = null;
  switch (info.menuItemId) {
    case 'ambrosia-save-link':  url = info.linkUrl; break;
    case 'ambrosia-save-image': url = info.srcUrl; break;
    case 'ambrosia-save-video': url = info.srcUrl; break;
    case 'ambrosia-save-page':  url = info.pageUrl; break;
  }
  if (url) await openAmbrosiaWith(url);
});

// Open the Ambrosia web app with the URL pre-filled. If a tab is
// already on Ambrosia, focus it and message the URL in via the bridge.
async function openAmbrosiaWith(url) {
  const tabs = await chrome.tabs.query({ url: AMBROSIA_WEB + '/*' });
  if (tabs.length > 0) {
    const tab = tabs[0];
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    // The bridge content script listens for window 'message' events
    // forwarded from this background. Use chrome.tabs.sendMessage to
    // hand off via the bridge.
    chrome.tabs.sendMessage(tab.id, { type: 'ambrosia-archive', url });
  } else {
    // No Ambrosia tab open — open one with ?archive=<url> query param
    // that the web app reads and triggers automatically.
    chrome.tabs.create({
      url: `${AMBROSIA_WEB}/?archive=${encodeURIComponent(url)}`,
    });
  }
}

// ───────────────────── Internal messages from content scripts ─────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'open-ambrosia-with' && msg.url) {
    openAmbrosiaWith(msg.url);
    sendResponse({ ok: true });
    return;
  }
});

// ───────────────────── Web app handshake ─────────────────────

// The web app uses externally_connectable to call into the extension.
// Message types:
//   - { type: 'ping' } → returns { ok, version }
//   - { type: 'fetch-bytes', url, requestId } → opens a port that
//     streams chunks of the URL's bytes back to the caller
//   - { type: 'fetch-text' / 'fetch-html-full', url } → HTML body
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (sender.origin !== AMBROSIA_WEB) {
    sendResponse({ ok: false, error: 'unauthorized origin' });
    return;
  }
  if (msg?.type === 'ping') {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return;
  }
  if (msg?.type === 'fetch-bytes') {
    fetchBytesAsBase64(msg.url)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));
    return true;
  }
  if (msg?.type === 'fetch-text') {
    fetchTextWithUserSession(msg.url)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));
    return true;
  }
  if (msg?.type === 'fetch-html-full') {
    fetchFullHtmlWithUserSession(msg.url)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));
    return true;
  }
  sendResponse({ ok: false, error: 'unknown message type' });
});

// Fetch a URL as text using the user's logged-in browser session.
// Extension runs from a residential IP and includes the user's cookies
// for the target host, so the response is what the user would see in
// their own browser — not the anonymous bot-walled shell that
// Instagram/Facebook/Reddit serve to fly.io. Caps the body size at 4 MB
// to avoid unbounded growth on huge pages.
async function fetchTextWithUserSession(url) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
    },
  });
  if (!response.ok) throw new Error(`fetch failed: HTTP ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const cap = 4 * 1024 * 1024;
  let total = 0;
  let html = '';
  while (total < cap) {
    const { value, done } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
    total += value.byteLength;
    if (/<\/head\s*>/i.test(html)) break;
  }
  try { reader.cancel(); } catch (_) {}
  return {
    body: html,
    finalUrl: response.url,
    contentType: response.headers.get('content-type') || 'text/html',
    truncated: total >= cap,
  };
}

// Like fetchTextWithUserSession but reads the entire response body
// (no </head> early exit) up to a much larger cap. Used by the
// webpage-snapshot capture path which needs the full document body.
async function fetchFullHtmlWithUserSession(url) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
    },
  });
  if (!response.ok) throw new Error(`fetch failed: HTTP ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const cap = 16 * 1024 * 1024;
  let total = 0;
  let html = '';
  while (total < cap) {
    const { value, done } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
    total += value.byteLength;
  }
  try { reader.cancel(); } catch (_) {}
  return {
    body: html,
    finalUrl: response.url,
    contentType: response.headers.get('content-type') || 'text/html',
    truncated: total >= cap,
  };
}

// Streaming port for big media files. Chunks are sent as ArrayBuffers
// over a chrome.runtime.connect port; the web app reads them into a
// MediaSource / Blob / ReadableStream as preferred.
chrome.runtime.onConnectExternal.addListener((port) => {
  if (port.sender?.origin !== AMBROSIA_WEB) {
    port.disconnect();
    return;
  }
  port.onMessage.addListener(async (msg) => {
    if (msg?.type === 'fetch-stream' && msg.url) {
      try {
        await streamUrlToPort(msg.url, port);
      } catch (err) {
        port.postMessage({ type: 'error', error: err.message || String(err) });
      }
    }
  });
});

async function streamUrlToPort(url, port) {
  const response = await fetchMedia(url);
  if (!response.ok) throw new Error(`fetch failed: HTTP ${response.status}`);
  const total = Number(response.headers.get('content-length')) || 0;
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  port.postMessage({ type: 'meta', contentType, total });

  const reader = response.body.getReader();
  let received = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    // Transfer the underlying buffer so we don't pay structured-clone
    // copy cost on multi-MB chunks.
    received += value.byteLength;
    port.postMessage({ type: 'chunk', chunk: value }, [value.buffer]);
  }
  port.postMessage({ type: 'end', received });
  port.disconnect();
}

// Fallback for small files (thumbnails). Returns base64-encoded bytes
// in a single sendResponse.
async function fetchBytesAsBase64(url) {
  const response = await fetchMedia(url);
  if (!response.ok) throw new Error(`fetch failed: HTTP ${response.status}`);
  const blob = await response.blob();
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return {
    base64: btoa(binary),
    contentType: blob.type || 'application/octet-stream',
    size: bytes.length,
  };
}

function mediaFetchOptions(url) {
  const opts = { credentials: 'include' };
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === 'pximg.net' || host.endsWith('.pximg.net')) {
      opts.referrer = 'https://www.pixiv.net/';
      opts.headers = {
        accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
      };
    }
  } catch (_) {}
  return opts;
}

function fetchMedia(url) {
  return fetch(url, mediaFetchOptions(url));
}

