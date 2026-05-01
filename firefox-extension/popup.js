const browserApi = globalThis.browser;
const AMBROSIA_WEB = 'https://ambrosia-web.fly.dev';

document.getElementById('version').textContent = 'v' + browserApi.runtime.getManifest().version;

document.getElementById('open-app').addEventListener('click', async () => {
  await openOrFocusAmbrosia();
});

document.getElementById('archive-current').addEventListener('click', async () => {
  const [tab] = await browserApi.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  await browserApi.runtime.sendMessage({ type: 'open-ambrosia-with', url: tab.url });
});

document.getElementById('pixiv-token-save').addEventListener('click', async () => {
  const input = document.getElementById('pixiv-refresh-token');
  const token = input.value.trim();
  if (!token) return;
  await browserApi.storage.local.set({ pixivRefreshToken: token });
  input.value = '';
  await renderPixivOauthStatus();
});

document.getElementById('pixiv-token-clear').addEventListener('click', async () => {
  await browserApi.storage.local.remove('pixivRefreshToken');
  document.getElementById('pixiv-refresh-token').value = '';
  await renderPixivOauthStatus();
});

async function openOrFocusAmbrosia() {
  const tabs = await browserApi.tabs.query({ url: AMBROSIA_WEB + '/*' });
  if (tabs.length > 0) {
    await browserApi.tabs.update(tabs[0].id, { active: true });
    await browserApi.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await browserApi.tabs.create({ url: AMBROSIA_WEB });
  }
  window.close();
}

// Sites Cobalt handles directly. Order matters for detection — these
// match before falling through to gallery-dl, since Cobalt is the
// preferred extractor for video-heavy platforms.
const COBALT_SITES = [
  ['tiktok.com', 'TikTok'],
  ['instagram.com', 'Instagram'],
  ['x.com', 'X (Twitter)'],
  ['twitter.com', 'X (Twitter)'],
  ['facebook.com', 'Facebook'],
  ['fb.watch', 'Facebook'],
  ['reddit.com', 'Reddit'],
  ['bsky.app', 'Bluesky'],
  ['vimeo.com', 'Vimeo'],
  ['twitch.tv', 'Twitch'],
  ['bilibili.com', 'Bilibili'],
  ['streamable.com', 'Streamable'],
  ['loom.com', 'Loom'],
  ['dailymotion.com', 'Dailymotion'],
  ['soundcloud.com', 'SoundCloud'],
];

const GALLERY_DL_SITES = Array.isArray(globalThis.GALLERY_DL_SUPPORTED_SITES)
  ? globalThis.GALLERY_DL_SUPPORTED_SITES
  : [];

function classifyUrl(url) {
  if (!url) return { route: 'unknown' };
  let host;
  try {
    host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return { route: 'invalid' };
  }
  const galleryDlSite = findGalleryDlSite(host);
  for (const [needle, label] of COBALT_SITES) {
    if (host === needle || host.endsWith('.' + needle)) {
      return { route: 'cobalt', label, host, galleryDlSite };
    }
  }
  if (galleryDlSite) {
    return { route: 'gallery-dl', label: displaySiteName(galleryDlSite.site), host, galleryDlSite };
  }
  // Direct media URL?
  const path = url.split('?')[0].toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|mp4|webm|mov|m4v|mp3|m4a)$/.test(path)) {
    return { route: 'direct', label: 'Direct media URL', host, galleryDlSite };
  }
  return { route: 'unknown', label: 'Web page', host, galleryDlSite };
}

function findGalleryDlSite(host) {
  return GALLERY_DL_SITES
    .filter((site) => host === site.host || host.endsWith('.' + site.host))
    .sort((a, b) => b.host.length - a.host.length)[0] || null;
}

function displaySiteName(site) {
  return String(site || '').replace(/^\[(.+)\]$/, '$1');
}

function renderGalleryDlDetails(site) {
  const panel = document.getElementById('gallery-dl-details');
  const capabilitiesEl = document.getElementById('gallery-dl-capabilities');
  const authEl = document.getElementById('gallery-dl-auth');
  const exampleEl = document.getElementById('gallery-dl-example');
  if (!site) {
    panel.classList.add('hidden');
    capabilitiesEl.textContent = '';
    authEl.textContent = '';
    exampleEl.textContent = '';
    return;
  }
  panel.classList.remove('hidden');
  capabilitiesEl.textContent = site.capabilities || 'Listed by gallery-dl';
  const auth = site.auth || 'None listed';
  authEl.textContent = auth;
  authEl.className = 'detail-value ' + (site.auth ? 'auth-required' : 'auth-none');
  const example = chooseExample(site);
  exampleEl.textContent = example ? `${example.label}: ${example.url}` : site.url;
}

function chooseExample(site) {
  const examples = Array.isArray(site.examples) ? site.examples : [];
  if (!examples.length) return null;
  return examples.find((example) => /individual|image|post|artwork|file/i.test(example.label))
    || examples[0];
}

async function renderPixivOauthStatus() {
  const statusEl = document.getElementById('pixiv-oauth-status');
  const stored = await browserApi.storage.local.get(['pixivRefreshToken']);
  const configured = !!String(stored.pixivRefreshToken || '').trim();
  statusEl.textContent = configured
    ? 'Configured for gallery-dl Pixiv extraction'
    : 'Paste the refresh token from `gallery-dl oauth:pixiv`';
  statusEl.className = 'oauth-status ' + (configured ? 'ok' : 'muted');
}

(async function init() {
  const [tab] = await browserApi.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  const cls = classifyUrl(url);

  const platformEl = document.getElementById('current-platform');
  const urlEl = document.getElementById('current-url');
  const archiveBtn = document.getElementById('archive-current');
  const supportEl = document.getElementById('current-support');

  urlEl.textContent = url || '(none)';
  renderGalleryDlDetails(cls.galleryDlSite);

  switch (cls.route) {
    case 'cobalt':
      platformEl.textContent = cls.label;
      supportEl.textContent = cls.galleryDlSite
        ? '✓ Cobalt preferred here; gallery-dl also supports this site'
        : '✓ Cobalt extractor — video-optimized path';
      supportEl.className = 'current-support ok';
      archiveBtn.disabled = false;
      break;
    case 'gallery-dl':
      platformEl.textContent = cls.label;
      supportEl.textContent = '✓ gallery-dl extractor — runs via the extension';
      supportEl.className = 'current-support ok';
      archiveBtn.disabled = false;
      break;
    case 'direct':
      platformEl.textContent = 'Direct media';
      supportEl.textContent = '✓ Direct file fetch — bypass extractors';
      supportEl.className = 'current-support ok';
      archiveBtn.disabled = false;
      break;
    case 'invalid':
      platformEl.textContent = 'No active tab';
      supportEl.textContent = '';
      break;
    default:
      platformEl.textContent = 'Web page';
      supportEl.textContent = 'No known extractor — paste a direct media URL into Ambrosia';
      supportEl.className = 'current-support muted';
      archiveBtn.disabled = false;
      break;
  }

  const webStatusEl = document.getElementById('web-status');
  try {
    const resp = await fetch(AMBROSIA_WEB + '/', { method: 'HEAD', cache: 'no-store' });
    webStatusEl.textContent = resp.ok ? 'reachable' : `HTTP ${resp.status}`;
    webStatusEl.classList.add(resp.ok ? 'ok' : 'fail');
  } catch (_) {
    webStatusEl.textContent = 'unreachable';
    webStatusEl.classList.add('fail');
  }

  const stored = await browserApi.storage.local.get(['libraryCount', 'lastArchiveAt']);
  if (stored.libraryCount != null) {
    document.getElementById('lib-count').textContent = `${stored.libraryCount} items`;
  }
  if (stored.lastArchiveAt) {
    const ago = Math.floor((Date.now() - stored.lastArchiveAt) / 60000);
    document.getElementById('last-archive').textContent =
      ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.floor(ago / 60)}h ago`;
  }
  await renderPixivOauthStatus();
})();
