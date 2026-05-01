const AMBROSIA_WEB = 'https://ambrosia-web.fly.dev';

document.getElementById('version').textContent = 'v' + chrome.runtime.getManifest().version;

document.getElementById('open-app').addEventListener('click', async () => {
  await openOrFocusAmbrosia();
});

document.getElementById('archive-current').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  await chrome.runtime.sendMessage({ type: 'open-ambrosia-with', url: tab.url });
});

async function openOrFocusAmbrosia() {
  const tabs = await chrome.tabs.query({ url: AMBROSIA_WEB + '/*' });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: AMBROSIA_WEB });
  }
  window.close();
}

const SUPPORTED_HOSTS = [
  ['tiktok.com', 'TikTok'],
  ['instagram.com', 'Instagram'],
  ['x.com', 'X'], ['twitter.com', 'X'],
  ['facebook.com', 'Facebook'],
  ['reddit.com', 'Reddit'],
  ['bsky.app', 'Bluesky'],
  ['vimeo.com', 'Vimeo'],
  ['twitch.tv', 'Twitch'],
];

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    for (const [needle, label] of SUPPORTED_HOSTS) {
      if (host === needle || host.endsWith('.' + needle)) return label;
    }
    return 'Web page';
  } catch { return null; }
}

(async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  const platform = detectPlatform(url);
  const platformEl = document.getElementById('current-platform');
  const urlEl = document.getElementById('current-url');
  const archiveBtn = document.getElementById('archive-current');
  if (platform) {
    platformEl.textContent = platform;
    urlEl.textContent = url;
    archiveBtn.disabled = false;
  } else {
    platformEl.textContent = 'Browser tab';
    urlEl.textContent = url || '(none)';
  }

  // Probe the web app status. Just a fetch — if it 200s, we're good.
  const webStatusEl = document.getElementById('web-status');
  try {
    const resp = await fetch(AMBROSIA_WEB + '/', { method: 'HEAD', cache: 'no-store' });
    webStatusEl.textContent = resp.ok ? 'reachable' : `HTTP ${resp.status}`;
    webStatusEl.classList.add(resp.ok ? 'ok' : 'fail');
  } catch (err) {
    webStatusEl.textContent = 'unreachable';
    webStatusEl.classList.add('fail');
  }

  // Library count + last archive: read from chrome.storage which the
  // web-app bridge populates. Empty until first archive.
  const stored = await chrome.storage.local.get(['libraryCount', 'lastArchiveAt']);
  if (stored.libraryCount != null) {
    document.getElementById('lib-count').textContent = `${stored.libraryCount} items`;
  }
  if (stored.lastArchiveAt) {
    const ago = Math.floor((Date.now() - stored.lastArchiveAt) / 60000);
    document.getElementById('last-archive').textContent =
      ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.floor(ago / 60)}h ago`;
  }
})();
