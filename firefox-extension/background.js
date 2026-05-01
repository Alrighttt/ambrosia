const browserApi = globalThis.browser;

const AMBROSIA_WEB = 'https://ambrosia-web.fly.dev';
const PAGE_STREAM_PREFIX = 'ambrosia-page-stream:';

browserApi.runtime.onInstalled.addListener(async () => {
  try { await browserApi.contextMenus.removeAll(); } catch (_) {}
  browserApi.contextMenus.create({
    id: 'ambrosia-save-link',
    title: 'Save link to Ambrosia',
    contexts: ['link'],
  });
  browserApi.contextMenus.create({
    id: 'ambrosia-save-image',
    title: 'Save image to Ambrosia',
    contexts: ['image'],
  });
  browserApi.contextMenus.create({
    id: 'ambrosia-save-video',
    title: 'Save video to Ambrosia',
    contexts: ['video'],
  });
  browserApi.contextMenus.create({
    id: 'ambrosia-save-page',
    title: 'Save this page to Ambrosia',
    contexts: ['page'],
  });
});

browserApi.contextMenus.onClicked.addListener(async (info) => {
  let url = null;
  switch (info.menuItemId) {
    case 'ambrosia-save-link': url = info.linkUrl; break;
    case 'ambrosia-save-image': url = info.srcUrl; break;
    case 'ambrosia-save-video': url = info.srcUrl; break;
    case 'ambrosia-save-page': url = info.pageUrl; break;
  }
  if (url) await openAmbrosiaWith(url);
});

browserApi.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'open-ambrosia-with' && msg.url) {
    return openAmbrosiaWith(msg.url).then(() => ({ ok: true }));
  }
  if (msg?.type === 'page-request') {
    return handlePageRequest(msg, sender);
  }
  return false;
});

browserApi.runtime.onConnect.addListener((port) => {
  if (!port.name?.startsWith(PAGE_STREAM_PREFIX)) return;
  if (!isAmbrosiaSender(port.sender)) {
    port.disconnect();
    return;
  }
  port.onMessage.addListener((msg) => {
    if (msg?.type === 'fetch-stream' && msg.url) {
      streamUrlToPort(msg.url, port).catch((err) => {
        port.postMessage({ event: 'error', error: err.message || String(err) });
      });
      return;
    }
    if (msg?.type === 'cancel') {
      try { port.disconnect(); } catch (_) {}
    }
  });
});

async function openAmbrosiaWith(url) {
  const tabs = await browserApi.tabs.query({ url: AMBROSIA_WEB + '/*' });
  if (tabs.length > 0) {
    const tab = tabs[0];
    await browserApi.tabs.update(tab.id, { active: true });
    await browserApi.windows.update(tab.windowId, { focused: true });
    await browserApi.tabs.sendMessage(tab.id, { type: 'ambrosia-archive', url });
    return;
  }
  await browserApi.tabs.create({
    url: `${AMBROSIA_WEB}/?archive=${encodeURIComponent(url)}`,
  });
}

async function handlePageRequest(msg, sender) {
  if (!isAmbrosiaSender(sender)) {
    return { ok: false, error: 'unauthorized origin' };
  }

  try {
    switch (msg.action) {
      case 'fetch-text':
        return { ok: true, result: await fetchTextWithUserSession(msg.payload?.url) };
      case 'fetch-html-full':
        return { ok: true, result: await fetchFullHtmlWithUserSession(msg.payload?.url) };
      case 'fetch-json':
        return { ok: true, result: await fetchJsonWithUserSession(msg.payload?.url) };
      case 'fetch-bytes':
        return { ok: true, result: await fetchBytesAsBase64(msg.payload?.url) };
      case 'extract-gallery-dl':
        return { ok: true, result: await runGalleryDl(msg.payload?.url) };
      case 'gallery-dl-status':
        return { ok: true, result: getGalleryDlBootStatus() };
      default:
        return { ok: false, error: `unknown action: ${msg.action}` };
    }
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

function isAmbrosiaSender(sender) {
  const url = sender?.url || sender?.tab?.url || sender?.origin || '';
  return typeof url === 'string' && url.startsWith(AMBROSIA_WEB);
}

async function fetchTextWithUserSession(url) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
// webpage-snapshot capture path which needs the full document body to
// preserve article content. fetchTextWithUserSession's head-only fast
// path is reserved for og:meta scraping where stopping at </head>
// saves seconds on long articles.
async function fetchFullHtmlWithUserSession(url) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

async function fetchJsonWithUserSession(url) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
    },
  });
  if (!response.ok) throw new Error(`fetch failed: HTTP ${response.status}`);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    throw new Error('response was not JSON');
  }
  return {
    body,
    finalUrl: response.url,
    contentType: response.headers.get('content-type') || 'application/json',
  };
}

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

async function streamUrlToPort(url, port) {
  const response = await fetchMedia(url);
  if (!response.ok) throw new Error(`fetch failed: HTTP ${response.status}`);

  port.postMessage({
    event: 'meta',
    contentType: response.headers.get('content-type') || 'application/octet-stream',
    total: Number(response.headers.get('content-length')) || 0,
  });

  const reader = response.body.getReader();
  let received = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    received += value.byteLength;
    port.postMessage({ event: 'chunk', chunk: value });
  }
  port.postMessage({ event: 'end', received });
  port.disconnect();
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

// ───────────────────── gallery-dl bridge ─────────────────────
//
// Lazy-loaded module: the first archive request that needs gallery-dl
// imports the runner, which kicks off Pyodide boot in the background.
// Subsequent requests are warm. On boot failure we surface an error so
// the web app can fall back to Cobalt instead of hanging forever.
let galleryDlModule = null;

async function loadGalleryDlModule() {
  if (!galleryDlModule) {
    galleryDlModule = await import(browserApi.runtime.getURL('gallery-dl.js'));
  }
  return galleryDlModule;
}

async function runGalleryDl(url) {
  if (!url) throw new Error('no url');
  const mod = await loadGalleryDlModule();
  const stored = await browserApi.storage.local.get(['pixivRefreshToken', 'imgurClientId']);
  return await mod.extractWithGalleryDl(url, {
    pixivRefreshToken: String(stored.pixivRefreshToken || '').trim(),
    // Empty string here means "use the bridge's hardcoded default" —
    // users only need to set this if they've registered their own
    // Client-ID at api.imgur.com/oauth2/addclient and want to swap in
    // their private quota for the shared default.
    imgurClientId: String(stored.imgurClientId || '').trim(),
  });
}

function getGalleryDlBootStatus() {
  if (!galleryDlModule) return { state: 'not-loaded', step: '' };
  return galleryDlModule.getGalleryDlStatus();
}
