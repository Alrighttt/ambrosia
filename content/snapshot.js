const adapters = globalThis.__ambrosiaAdapters__ || [];
const activeAdapter = adapters.find((a) => {
  try { return a.match(); } catch { return false; }
}) || null;

if (activeAdapter) {
  try { activeAdapter.init(); } catch (err) { console.warn('[ambrosia] adapter init failed', err); }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg?.type) {
    case 'ambrosia/take-snapshot':
      try { sendResponse({ ok: true, snapshot: buildSnapshot() }); }
      catch (err) { sendResponse({ ok: false, error: err.message || String(err) }); }
      return false;

    case 'ambrosia/extract-video': {
      if (!activeAdapter) {
        sendResponse({ ok: false, error: 'no video adapter for this site' });
        return false;
      }
      const info = activeAdapter.getInfo();
      if (!info) {
        sendResponse({ ok: false, error: 'no video detected on this page' });
        return false;
      }
      const stream = activeAdapter.pickStream ? activeAdapter.pickStream(info) : null;
      sendResponse({ ok: true, info, stream });
      return false;
    }
  }
  return false;
});

function buildSnapshot() {
  return {
    url: location.href,
    origin: location.origin,
    title: document.title,
    capturedAt: new Date().toISOString(),
    contentType: document.contentType || 'text/html',
    html: '<!doctype html>\n' + document.documentElement.outerHTML,
    resources: collectResources(),
  };
}

function collectResources() {
  const list = [];
  const seen = new Set();
  const push = (raw, type) => {
    if (!raw) return;
    let abs;
    try { abs = new URL(raw, location.href).href; } catch { return; }
    if (!/^https?:/i.test(abs)) return;
    const key = type + '|' + abs;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ url: abs, type });
  };

  document.querySelectorAll('img[src]').forEach((el) => push(el.getAttribute('src'), 'image'));
  document.querySelectorAll('img[srcset], source[srcset]').forEach((el) => {
    const set = el.getAttribute('srcset');
    if (!set) return;
    set.split(',').forEach((part) => push(part.trim().split(/\s+/)[0], 'image'));
  });
  document.querySelectorAll('link[rel~="stylesheet"][href]').forEach((el) => push(el.getAttribute('href'), 'stylesheet'));
  document.querySelectorAll('link[rel~="icon"][href], link[rel~="apple-touch-icon"][href]').forEach((el) => push(el.getAttribute('href'), 'icon'));
  document.querySelectorAll('link[rel~="preload"][href], link[rel~="prefetch"][href]').forEach((el) => push(el.getAttribute('href'), 'preload'));
  document.querySelectorAll('script[src]').forEach((el) => push(el.getAttribute('src'), 'script'));
  document.querySelectorAll('video[src], audio[src]').forEach((el) => push(el.getAttribute('src'), 'media'));
  document.querySelectorAll('video source[src], audio source[src]').forEach((el) => push(el.getAttribute('src'), 'media'));
  document.querySelectorAll('video[poster]').forEach((el) => push(el.getAttribute('poster'), 'image'));
  document.querySelectorAll('iframe[src]').forEach((el) => push(el.getAttribute('src'), 'iframe'));
  document.querySelectorAll('object[data]').forEach((el) => push(el.getAttribute('data'), 'object'));
  return list;
}
