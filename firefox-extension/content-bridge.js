const browserApi = globalThis.browser;
const EXT_ID = browserApi.runtime.id;
const CAPABILITIES = {
  relay: true,
  fetchText: true,
  fetchJson: true,
  fetchBytes: true,
  fetchStream: true,
};
const openPorts = new Map();

announcePresence();

window.addEventListener('message', async (e) => {
  if (e.source !== window || e.origin !== window.location.origin) return;
  const data = e.data;
  if (!data || data.source !== 'ambrosia-page') return;

  if (data.type === 'who-are-you') {
    announcePresence();
    return;
  }

  if (data.type === 'extension-request' && data.requestId && data.action) {
    try {
      const response = await browserApi.runtime.sendMessage({
        type: 'page-request',
        requestId: data.requestId,
        action: data.action,
        payload: data.payload || null,
      });
      postToPage({
        source: 'ambrosia-extension',
        type: 'response',
        requestId: data.requestId,
        ok: !!response?.ok,
        result: response?.result,
        error: response?.error || null,
      });
    } catch (err) {
      postToPage({
        source: 'ambrosia-extension',
        type: 'response',
        requestId: data.requestId,
        ok: false,
        error: err?.message || String(err),
      });
    }
    return;
  }

  if (data.type === 'extension-stream-open' && data.requestId && data.payload?.url) {
    const port = browserApi.runtime.connect({ name: `ambrosia-page-stream:${data.requestId}` });
    openPorts.set(data.requestId, port);

    port.onMessage.addListener((msg) => {
      postToPage({
        source: 'ambrosia-extension',
        type: 'stream',
        requestId: data.requestId,
        event: msg.event || msg.type,
        contentType: msg.contentType,
        total: msg.total,
        chunk: msg.chunk,
        received: msg.received,
        error: msg.error || null,
      });
    });
    port.onDisconnect.addListener(() => {
      openPorts.delete(data.requestId);
      postToPage({
        source: 'ambrosia-extension',
        type: 'stream',
        requestId: data.requestId,
        event: 'disconnect',
      });
    });
    port.postMessage({ type: 'fetch-stream', url: data.payload.url });
    return;
  }

  if (data.type === 'extension-stream-cancel' && data.requestId) {
    const port = openPorts.get(data.requestId);
    if (!port) return;
    try { port.postMessage({ type: 'cancel' }); } catch (_) {}
    try { port.disconnect(); } catch (_) {}
    openPorts.delete(data.requestId);
  }
});

browserApi.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'ambrosia-archive' && msg.url) {
    postToPage(
      { source: 'ambrosia-extension', type: 'archive-request', url: msg.url },
    );
  }
});

function announcePresence() {
  postToPage({
    source: 'ambrosia-extension',
    type: 'present',
    extensionId: EXT_ID,
    version: browserApi.runtime.getManifest().version,
    capabilities: CAPABILITIES,
    browser: 'firefox',
  });
}

function postToPage(message) {
  window.postMessage(message, window.location.origin);
}
