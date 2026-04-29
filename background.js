const videoByTab = new Map();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg?.type) {
    case 'ambrosia/video-detected': {
      if (typeof sender.tab?.id === 'number') {
        videoByTab.set(sender.tab.id, {
          site: msg.site,
          summary: msg.summary,
          preview: msg.preview,
        });
      }
      sendResponse({ ok: true });
      return false;
    }
    case 'ambrosia/get-status': {
      sendResponse({ video: videoByTab.get(msg.tabId) || null });
      return false;
    }
    case 'ambrosia/archive-page': {
      archivePage(msg.tabId).then(
        (result) => sendResponse({ ok: true, result }),
        (err) => sendResponse({ ok: false, error: err.message || String(err) }),
      );
      return true;
    }
    case 'ambrosia/archive-video': {
      archiveVideo(msg.tabId).then(
        (result) => sendResponse({ ok: true, result }),
        (err) => sendResponse({ ok: false, error: err.message || String(err) }),
      );
      return true;
    }
  }
  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => videoByTab.delete(tabId));

async function archivePage(tabId) {
  const resp = await chrome.tabs.sendMessage(tabId, { type: 'ambrosia/take-snapshot' });
  if (!resp?.ok) throw new Error(resp?.error || 'no snapshot');
  // TODO: fetch each resource, build a sia-site v1 manifest, hand to sialo SDK.
  return summariseSnapshot(resp.snapshot);
}

async function archiveVideo(tabId) {
  const resp = await chrome.tabs.sendMessage(tabId, { type: 'ambrosia/extract-video' });
  if (!resp?.ok) throw new Error(resp?.error || 'no video');
  // TODO: stream the chosen format through the sialo SDK and pin it.
  return {
    site: resp.info.site,
    title: resp.info.title,
    author: resp.info.author,
    duration: resp.info.duration,
    selected: resp.stream ? {
      itag: resp.stream.itag,
      mimeType: resp.stream.mimeType,
      bitrate: resp.stream.bitrate,
      contentLength: resp.stream.contentLength,
    } : null,
  };
}

function summariseSnapshot(s) {
  const counts = {};
  for (const r of s.resources) counts[r.type] = (counts[r.type] || 0) + 1;
  return {
    url: s.url,
    title: s.title,
    capturedAt: s.capturedAt,
    htmlBytes: new Blob([s.html]).size,
    resourceCount: s.resources.length,
    resourcesByType: counts,
  };
}
