// Detect + talk to the Ambrosia browser extension.
//
// The extension's content-bridge.js posts a `present` message to the
// page on load. We listen for it during boot, and the page can also
// query at any time via window.postMessage('who-are-you'). Extension
// presence unlocks gallery-dl coverage (Cobalt can't run it from
// fly.io's IP) and the "?archive=<url>" deep-link from FAB / context
// menu clicks.

let extensionId = null;
let extensionVersion = null;
let extensionCapabilities = null;
const archiveRequestHandlers = new Set();
const presenceWaiters = new Set();
const pendingRequests = new Map();
const streamHandlers = new Map();
let nextRequestId = 1;

window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  const data = e.data;
  if (!data || data.source !== 'ambrosia-extension') return;

  if (data.type === 'present') {
    const isFirstPresence = !extensionId;
    extensionId = data.extensionId || extensionId;
    extensionVersion = data.version || extensionVersion;
    extensionCapabilities = data.capabilities || extensionCapabilities;
    if (isFirstPresence) {
      console.log('[ambrosia] extension detected', extensionId, 'v' + extensionVersion);
      for (const cb of presenceWaiters) cb();
      presenceWaiters.clear();
    }
    return;
  }
  if (data.type === 'response' && data.requestId) {
    const pending = pendingRequests.get(data.requestId);
    if (!pending) return;
    pendingRequests.delete(data.requestId);
    clearTimeout(pending.timer);
    if (data.ok) {
      pending.resolve(data.result);
    } else {
      pending.reject(new Error(data.error || 'extension request failed'));
    }
    return;
  }
  if (data.type === 'stream' && data.requestId) {
    const handler = streamHandlers.get(data.requestId);
    if (handler) handler(data);
    return;
  }
  if (data.type === 'archive-request' && data.url) {
    for (const handler of archiveRequestHandlers) {
      try { handler(data.url); } catch (_) {}
    }
    return;
  }
});

// Re-ask presence in case the bridge script started after us.
window.postMessage({ source: 'ambrosia-page', type: 'who-are-you' }, window.location.origin);

export function isExtensionInstalled() {
  return !!extensionId;
}

export function extensionVersionStr() {
  return extensionVersion;
}

function nextId() {
  nextRequestId += 1;
  return `ambrosia-ext-${nextRequestId}`;
}

function supportsRelay() {
  return !!extensionCapabilities?.relay;
}

function hasLegacyMessaging() {
  return !!(extensionId && globalThis.chrome?.runtime?.sendMessage);
}

function postToBridge(message) {
  window.postMessage({ source: 'ambrosia-page', ...message }, window.location.origin);
}

function relayRequest(action, payload, timeoutMs = 20000) {
  if (!extensionId) throw new Error('extension not installed');
  if (!supportsRelay()) throw new Error('extension relay not available');

  const requestId = nextId();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`extension request timed out: ${action}`));
    }, timeoutMs);
    pendingRequests.set(requestId, { resolve, reject, timer });
    postToBridge({ type: 'extension-request', requestId, action, payload });
  });
}

function legacySendMessage(message) {
  if (!extensionId) throw new Error('extension not installed');
  if (!hasLegacyMessaging()) throw new Error('legacy extension messaging unavailable');

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(extensionId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || 'extension error'));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || 'extension request failed'));
        return;
      }
      resolve(response.result);
    });
  });
}

export function waitForExtension(timeoutMs = 800) {
  if (extensionId) return Promise.resolve(true);
  return new Promise((resolve) => {
    const cb = () => resolve(true);
    presenceWaiters.add(cb);
    setTimeout(() => {
      presenceWaiters.delete(cb);
      resolve(!!extensionId);
    }, timeoutMs);
  });
}

export function onArchiveRequest(handler) {
  archiveRequestHandlers.add(handler);
  return () => archiveRequestHandlers.delete(handler);
}

// Ask the extension to fetch a URL's HTML via the user's logged-in
// browser session. Extension runs from residential IP with user cookies,
// so login-walled platforms (Instagram, Reddit, Facebook) return their
// real authenticated HTML — caption + image URLs in og: tags — rather
// than the anonymous shell the server-side scraper sees.
export async function fetchUrlViaExtension(url) {
  if (supportsRelay()) return await relayRequest('fetch-text', { url });
  return await legacySendMessage({ type: 'fetch-text', url });
}

// Same as fetchUrlViaExtension but uses the full-document fetch action
// that does NOT short-circuit at </head>. Required by the webpage-
// snapshot capture path so the article body actually makes it into the
// archive — the head-only fast path was preserving meta tags only.
// Extensions that don't expose `fetch-html-full` (older builds) fall
// back to the truncated fetch-text path; the relay request will still
// succeed, just with body=head-only.
export async function fetchFullHtmlViaExtension(url) {
  const action = 'fetch-html-full';
  try {
    if (supportsRelay()) return await relayRequest(action, { url }, 60000);
    return await legacySendMessage({ type: action, url });
  } catch (err) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('unknown') || msg.includes('unsupported')) {
      console.warn('[ambrosia] extension lacks fetch-html-full; falling back to truncated fetch-text');
      return await fetchUrlViaExtension(url);
    }
    throw err;
  }
}

export async function fetchJsonViaExtension(url) {
  if (supportsRelay()) return await relayRequest('fetch-json', { url });
  const result = await legacySendMessage({ type: 'fetch-text', url });
  return {
    body: JSON.parse(result?.body || 'null'),
    finalUrl: result?.finalUrl || url,
    contentType: result?.contentType || 'application/json',
  };
}

export async function fetchBytesViaExtension(url) {
  const result = supportsRelay()
    ? await relayRequest('fetch-bytes', { url })
    : await legacySendMessage({ type: 'fetch-bytes', url });
  const bytes = decodeBase64(result?.base64 || '');
  return {
    blob: new Blob([bytes], { type: result?.contentType || 'application/octet-stream' }),
    contentType: result?.contentType || 'application/octet-stream',
    size: result?.size || bytes.length,
  };
}

// gallery-dl categories where matched-but-zero-items is the common,
// expected outcome — the extractor recognized the URL but the page
// is text-first, with images embedded but not extractable as standalone
// media. For these, surfacing a "no media" error is misleading; we
// fall through to the webpage-snapshot path so the user gets the
// article body archived. Add new entries as they come up.
const TEXT_DOCUMENT_CATEGORIES = new Set([
  'wikipedia',
  'wikimedia',
  'mediawiki',
]);

// Run gallery-dl inside the extension (Pyodide). Returns null when no
// gallery-dl extractor matches the URL — caller should fall back to
// Cobalt. First call is slow (~5-15s) while Pyodide boots; subsequent
// calls are ~1-3s. The wide timeout reflects the cold-start cost.
//
// Errors thrown carry an `extractorMatched: true` flag when a
// gallery-dl extractor actually matched the URL but failed to extract
// (auth required, etc.) — caller can surface the gallery-dl-specific
// message instead of falling through to a worse fallback.
export async function extractViaGalleryDl(url) {
  if (!supportsRelay()) {
    throw new Error('gallery-dl requires relay-capable extension');
  }
  const r = await relayRequest('extract-gallery-dl', { url }, 60000);
  console.info('[ambrosia] gallery-dl response:', {
    matched: r?.matched,
    category: r?.category,
    subcategory: r?.subcategory,
    itemCount: r?.items?.length || 0,
    error: r?.error,
    truncated: r?.truncated,
  });
  // Always surface a bridge-reported error, even when matched=false.
  // matched=false + error set means gallery-dl's extractor.find()
  // itself raised — that's diagnostic info the user needs (e.g. a
  // bundled-gallery-dl import bug or a malformed URL), not something
  // to swallow into a misleading "no extractor matched" fallback.
  if (r?.error) {
    const e = new Error(r.error);
    e.extractorMatched = !!r.matched;
    e.extractorCategory = r.category || null;
    e.galleryDlResponse = r;
    throw e;
  }
  if (!r || !r.matched) return null;

  // Filter to URLs we can actually fetch. gallery-dl emits `ytdl:`
  // pseudo-URLs for video content that needs yt-dlp processing
  // (Reddit's DASHPlaylist.mpd, etc.) and other extractors emit
  // `text:` and similar pseudo-protocols. We can't process any of
  // those — only http(s) and data URLs are real fetchable resources.
  const allItems = Array.isArray(r.items) ? r.items : [];
  const playable = allItems.filter((item) => /^(https?:|data:)/i.test(String(item?.url || '')));

  if (playable.length === 0 && allItems.length > 0) {
    // gallery-dl matched and emitted items, but none are URLs we can
    // fetch. Return null so the caller's fallback chain (Cobalt,
    // site-specific extractors like extractRedditMedia) gets a turn.
    // Reddit videos hit this exact path: gallery-dl yields a ytdl:
    // DASH URL and we hand off to Cobalt, which handles Reddit video
    // natively via its own muxing.
    console.info('[ambrosia] gallery-dl matched but emitted only unsupported pseudo-URLs:', {
      category: r.category,
      pseudoUrls: allItems.map((i) => i.url),
    });
    return null;
  }

  // matched extractor produced zero Url messages. Distinct from the
  // "no extractor found" case above — caller should NOT fall through
  // to other extractors because the right one already ran and decided
  // there was nothing to extract (deleted post, empty gallery, etc.).
  //
  // Exception: for text-document categories (Wikipedia articles,
  // wiki pages, etc.) zero items is the COMMON case — the extractor
  // matched but the page is mostly text. We let the caller fall
  // through to the webpage-snapshot path so the user actually gets
  // the article they meant to archive instead of an error.
  if (playable.length === 0) {
    if (TEXT_DOCUMENT_CATEGORIES.has(r.category)) {
      console.info(
        '[ambrosia] gallery-dl matched',
        r.category,
        'with zero media — falling through to webpage snapshot since the article body is the real content.',
      );
      return null;
    }
    const e = new Error(
      `gallery-dl matched ${r.category || 'this URL'} but extracted no media items. The post may be deleted, private, or empty.`,
    );
    e.extractorMatched = true;
    e.extractorCategory = r.category || null;
    e.galleryDlResponse = r;
    e.zeroItems = true;
    throw e;
  }
  // Convert gallery-dl's items to the Cobalt-shaped item list the rest
  // of the archive flow expects. Each gallery-dl item is a direct CDN
  // URL — wrap as an extension-stream URL so the upload path fetches
  // via the extension (with user's session cookies) instead of from
  // the page (which would CORS-block on most platform CDNs).
  return playable.map((item, idx) => ({
    kind: classifyByExtension(item.extension),
    url: makeExtensionStreamUrl(item.url),
    filename: composeFilename(item, idx),
    thumbnailUrl: null,
    _galleryDl: { category: r.category, subcategory: r.subcategory, ...item },
  }));
}

export async function getGalleryDlStatus() {
  if (!supportsRelay()) return { state: 'unavailable', step: '' };
  try {
    return await relayRequest('gallery-dl-status', {}, 5000);
  } catch {
    return { state: 'unavailable', step: '' };
  }
}

function classifyByExtension(ext) {
  const e = String(ext || '').toLowerCase();
  if (/^(mp4|webm|mov|m4v|mkv)$/.test(e)) return 'video';
  if (/^(mp3|m4a|opus|flac|wav|ogg)$/.test(e)) return 'audio';
  return 'photo';
}

function composeFilename(item, idx) {
  const base = item.filename || `gallery-dl-${idx + 1}`;
  const ext = item.extension ? `.${item.extension}` : '';
  // gallery-dl filenames are typically just the stem; we may already
  // have the extension in the filename, so guard against doubling up.
  if (base.toLowerCase().endsWith(ext.toLowerCase())) return base;
  return base + ext;
}

// Marker scheme so the upload flow knows which item.url to fetch via
// the extension stream port instead of a normal `fetch()`. Real CDN
// URLs would CORS-block from the page anyway.
const STREAM_SCHEME = 'ambrosia-ext-stream:';
export function makeExtensionStreamUrl(realUrl) {
  return STREAM_SCHEME + realUrl;
}
export function isExtensionStreamUrl(s) {
  return typeof s === 'string' && s.startsWith(STREAM_SCHEME);
}
function unwrapStreamUrl(s) {
  return s.slice(STREAM_SCHEME.length);
}

function legacyFetchViaExtension(streamUrl) {
  let contentType = 'application/octet-stream';
  let total = 0;
  let port;

  const stream = new ReadableStream({
    type: 'bytes',
    start(controller) {
      port = chrome.runtime.connect(extensionId);
      port.onMessage.addListener((msg) => {
        if (msg.type === 'meta') {
          contentType = msg.contentType || contentType;
          total = msg.total || 0;
        } else if (msg.type === 'chunk') {
          controller.enqueue(toUint8Array(msg.chunk));
        } else if (msg.type === 'end') {
          controller.close();
        } else if (msg.type === 'error') {
          controller.error(new Error(msg.error || 'extension stream error'));
        }
      });
      port.onDisconnect.addListener(() => {
        try { controller.close(); } catch (_) {}
      });
      port.postMessage({ type: 'fetch-stream', url: unwrapStreamUrl(streamUrl) });
    },
    cancel() {
      try { port?.disconnect(); } catch (_) {}
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': contentType,
      ...(total > 0 ? { 'content-length': String(total) } : {}),
    },
  });
}

// Open a port to the extension and stream the URL's bytes. Returns a
// Response object with a ReadableStream body so callers can pass it
// straight to the SDK upload (which expects a body stream).
export function fetchViaExtension(streamUrl) {
  if (!extensionId) throw new Error('extension not installed');
  if (!isExtensionStreamUrl(streamUrl)) throw new Error('not an extension stream URL');
  if (!supportsRelay()) return legacyFetchViaExtension(streamUrl);

  let contentType = 'application/octet-stream';
  let total = 0;
  const requestId = nextId();
  const realUrl = unwrapStreamUrl(streamUrl);

  // Watchdog: if the bridge / background never produces a `meta` event
  // within the deadline, the stream silently stalls forever and the
  // upload UI gets stuck at "uploading item 1/N…". Surface a real
  // error instead so the user sees something actionable.
  const STREAM_OPEN_TIMEOUT_MS = 15000;
  let openTimer = null;
  let openedAt = 0;
  let receivedAny = false;
  let bytesReceived = 0;

  const stream = new ReadableStream({
    type: 'bytes',
    start(controller) {
      openedAt = performance.now();
      console.info('[ambrosia] ext-stream open', { requestId, url: realUrl });
      openTimer = setTimeout(() => {
        if (!receivedAny) {
          console.warn('[ambrosia] ext-stream watchdog: no bytes from bridge after',
            STREAM_OPEN_TIMEOUT_MS, 'ms', { requestId, url: realUrl });
          streamHandlers.delete(requestId);
          try {
            controller.error(new Error(
              `extension stream timed out (no response from background script after ${STREAM_OPEN_TIMEOUT_MS / 1000}s) — check the extension's background console`,
            ));
          } catch (_) {}
          postToBridge({ type: 'extension-stream-cancel', requestId });
        }
      }, STREAM_OPEN_TIMEOUT_MS);

      streamHandlers.set(requestId, (msg) => {
        if (msg.event === 'meta') {
          receivedAny = true;
          if (openTimer) { clearTimeout(openTimer); openTimer = null; }
          contentType = msg.contentType || contentType;
          total = msg.total || 0;
          console.info('[ambrosia] ext-stream meta', {
            requestId,
            ms: Math.round(performance.now() - openedAt),
            contentType, total,
          });
        } else if (msg.event === 'chunk') {
          receivedAny = true;
          if (openTimer) { clearTimeout(openTimer); openTimer = null; }
          const u8 = toUint8Array(msg.chunk);
          bytesReceived += u8.byteLength;
          controller.enqueue(u8);
        } else if (msg.event === 'end') {
          if (openTimer) { clearTimeout(openTimer); openTimer = null; }
          console.info('[ambrosia] ext-stream end', {
            requestId, bytesReceived,
            ms: Math.round(performance.now() - openedAt),
          });
          streamHandlers.delete(requestId);
          controller.close();
        } else if (msg.event === 'disconnect') {
          if (openTimer) { clearTimeout(openTimer); openTimer = null; }
          streamHandlers.delete(requestId);
          try { controller.close(); } catch (_) {}
        } else if (msg.event === 'error') {
          if (openTimer) { clearTimeout(openTimer); openTimer = null; }
          console.warn('[ambrosia] ext-stream error', { requestId, error: msg.error });
          streamHandlers.delete(requestId);
          controller.error(new Error(msg.error || 'extension stream error'));
        }
      });
      postToBridge({
        type: 'extension-stream-open',
        requestId,
        action: 'fetch-stream',
        payload: { url: realUrl },
      });
    },
    cancel() {
      if (openTimer) { clearTimeout(openTimer); openTimer = null; }
      streamHandlers.delete(requestId);
      postToBridge({ type: 'extension-stream-cancel', requestId });
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': contentType,
      ...(total > 0 ? { 'content-length': String(total) } : {}),
    },
  });
}

function decodeBase64(input) {
  const binary = atob(input || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return new Uint8Array(value || []);
}
