import init, { setLogger } from './vendor/sia-storage/sia_storage_wasm.js';
import { disposeSdk, getSdk, invalidateSdk } from './lib/sdk.js';
import { extractMedia, cobaltUrl, isRedditUrl } from './lib/cobalt.js';
import { fetchRedditThread } from './lib/reddit.js';
import { buildSiteManifest, parseSiteManifest } from './lib/webpage.js';
import { scrapePageMeta } from './lib/scrape.js';
import {
  extensionVersionStr,
  fetchBytesViaExtension,
  fetchViaExtension,
  isExtensionInstalled,
  isExtensionStreamUrl,
  onArchiveRequest,
  waitForExtension,
} from './lib/extension.js';
import { clearAll, getStored } from './lib/storage.js';
import {
  addArchive,
  listArchives,
  removeArchive,
  replaceArchives,
  syncLibraryFromSia,
} from './lib/archives.js';
import {
  clearThumbCache,
  deleteCachedThumb,
  getCachedThumb,
  setCachedThumb,
} from './lib/thumbcache.js';
import { GALLERY_DL_SUPPORTED_SITES } from './lib/gallery-dl-sites.js';
import { COBALT_SUPPORTED_SITES } from './lib/cobalt-sites.js';

const SHARE_VALIDITY_MS = 100 * 365 * 24 * 60 * 60 * 1000;

const setupCard = document.getElementById('setup-needed');
const libraryList = document.getElementById('library-list');
const libraryEmpty = document.getElementById('library-empty');
const libraryCount = document.getElementById('library-count');
const fabAdd = document.getElementById('fab-add');
const addModal = document.getElementById('add-modal');
const settingsToggle = document.getElementById('settings-toggle');
const settingsMenu = document.getElementById('settings-menu');
const supportedSitesOpen = document.getElementById('supported-sites-open');
const supportedSitesModal = document.getElementById('supported-sites-modal');
const supportedSitesSearch = document.getElementById('supported-sites-search');
const supportedSitesCount = document.getElementById('supported-sites-count');
const supportedSitesResults = document.getElementById('supported-sites-results');
const form = document.getElementById('form');
const urlInput = document.getElementById('url');
const archiveBtn = document.getElementById('archive-btn');
const progressEl = document.getElementById('progress');
const progressTitle = document.getElementById('progress-title');
const progressCounter = document.getElementById('progress-counter');
const progressFill = document.getElementById('progress-fill');
const progressDetail = document.getElementById('progress-detail');
const batchEl = document.getElementById('batch');
const batchTilesEl = document.getElementById('batch-tiles');
const resultCard = document.getElementById('result-card');
const resultSubtitle = document.getElementById('result-subtitle');
const resultDone = document.getElementById('result-done');

// The Sia SDK opens ~10 speculative WebTransport sessions in parallel
// during connection warming, picks the fastest few, and closes the
// rest while their `ready` promises are still pending. Each close-
// during-connect rejects with `WebTransportError: close() called on
// WebTransport while connecting` — nothing's awaiting them, so they
// surface as "Uncaught (in promise)" noise in the console even though
// they're the SDK's intended pool-churn behavior. Match by message so
// we catch this regardless of how the WASM bindings wrap the error
// (sometimes the `name` is missing or differs). Listener has to be
// attached BEFORE init() — the SDK starts spawning sessions inside
// init() and rejections fire synchronously during that boot phase.
function isWebTransportPoolNoise(reason) {
  if (!reason) return false;
  const msg = reason.message || (typeof reason === 'string' ? reason : String(reason));
  return /close\(\)\s*called on WebTransport while connecting/i.test(msg);
}
window.addEventListener('unhandledrejection', (e) => {
  if (isWebTransportPoolNoise(e.reason)) e.preventDefault();
});
window.addEventListener('error', (e) => {
  if (isWebTransportPoolNoise(e.error || e.message)) e.preventDefault();
});

const wasmReady = init();

// Firefox can keep HTTP/3/WebTransport sessions around after a page is
// closed if async Rust tasks are frozen while holding SDK transport refs.
// The SDK's dispose() hook synchronously closes pooled transports, so run
// it from pagehide while the document is still alive.
window.addEventListener('pagehide', (e) => {
  // event.persisted=true means Firefox is parking us in bfcache, not
  // unloading. The page will resume alive when the user returns —
  // disposing the SDK now would tear down WebTransport sessions on a
  // page that's about to keep using them, leaving downloads broken
  // and blob URLs dangling. Only dispose on real unload.
  if (e.persisted) return;
  disposeSdk('pagehide');
});
window.addEventListener('beforeunload', () => {
  disposeSdk('beforeunload');
});

// Optional SDK debug logging — enable on the device hitting the
// problem by running this in DevTools console:
//   localStorage.setItem('ambrosia.sdkLogLevel', 'debug'); location.reload();
// Levels: off | error | warn | info | debug | trace. Off in normal use
// because trace floods the console; turn it on while reproducing
// "not enough shards" / "object not found" failures to see what the
// SDK was doing right before the error.
wasmReady.then(() => {
  const level = (localStorage.getItem('ambrosia.sdkLogLevel') || '').trim();
  if (level && ['error', 'warn', 'info', 'debug', 'trace'].includes(level)) {
    try {
      setLogger((msg) => console.log('[sia-sdk]', msg), level);
      console.log(`[ambrosia] sia-sdk log level: ${level}`);
    } catch (err) {
      console.warn('[ambrosia] failed to set SDK log level:', err);
    }
  }
}).catch(() => {});

async function bootstrap() {
  const stored = await getStored();
  if (!stored.appKey) {
    setupCard.classList.remove('hidden');
    fabAdd.classList.add('hidden');
    return;
  }
  fabAdd.classList.remove('hidden');
  await renderLibrary();
  // Eagerly start WASM init in the background; the SDK call later will await this anyway.
  wasmReady.catch(() => {});

  // If the local cache is empty (fresh device, browser data cleared, restore
  // from recovery phrase), pull the library back from Sia by walking object
  // metadata. Don't block bootstrap on it — let the user start archiving
  // immediately while the sync runs in the background.
  const local = await listArchives();
  if (local.length === 0) {
    syncLibraryInBackground({ replace: true });
  }
}

async function syncLibraryInBackground({ replace = false } = {}) {
  try {
    await wasmReady;
    const sdk = await getSdk();
    const records = await syncLibraryFromSia(sdk, {
      onProgress: (n) => { console.log(`[ambrosia] sync: scanned ${n} objects`); },
    });
    if (records.length === 0) return;
    if (replace) {
      await replaceArchives(records);
    } else {
      // Merge: keep any local entries whose sourceUrl isn't in the synced set.
      const synced = new Set(records.map((r) => r.sourceUrl));
      const existing = (await listArchives()).filter((a) => !synced.has(a.sourceUrl));
      await replaceArchives([...records, ...existing]);
    }
    await renderLibrary();
  } catch (err) {
    console.warn('[ambrosia] sync from Sia failed:', err);
  }
}

async function renderLibrary() {
  const archives = await listArchives();
  libraryList.innerHTML = '';
  libraryCount.textContent = archives.length ? `${archives.length} item${archives.length === 1 ? '' : 's'}` : '';
  libraryEmpty.classList.toggle('hidden', archives.length > 0);
  for (const a of archives) {
    libraryList.appendChild(renderEntry(a));
  }
}

// Return a labeled archive timestamp string. Always prefixed with
// "Archived" so it can never be confused with the post's *original*
// upload time (which might also appear nearby). Recent archives get a
// relative phrasing ("just now", "5 min ago") because they're more
// useful in the heat of a demo / first-time browsing session; older
// ones fall back to absolute date+time.
function formatArchivedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const ageMs = Date.now() - d.getTime();
  const min = Math.floor(ageMs / 60000);
  if (ageMs >= 0 && min < 60) {
    if (min < 1) return 'Archived just now';
    if (min === 1) return 'Archived 1 min ago';
    return `Archived ${min} min ago`;
  }
  try {
    return 'Archived ' + new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return 'Archived ' + d.toLocaleString();
  }
}

// Full-precision ISO for hover tooltip ("Archived <relative>" alone is
// ambiguous about which day; tooltip discloses the exact moment).
function archivedAtTooltip(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return 'Archived to Sia at ' + new Intl.DateTimeFormat(undefined, {
      dateStyle: 'full',
      timeStyle: 'long',
    }).format(d);
  } catch {
    return 'Archived to Sia at ' + d.toString();
  }
}

function renderEntry(a) {
  const platform = a.platform || detectPlatform(a.sourceUrl) || 'default';
  const li = document.createElement('li');
  li.className = `library-entry platform-${platform}`;
  li.dataset.id = a.id;
  if (a.type) li.dataset.type = a.type;

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  const fallbackEmoji = a.type === 'thread' ? '💬'
    : a.type === 'webpage' ? '📄'
    : a.type === 'photo' ? '🖼'
    : a.type === 'audio' ? '🎵'
    : '🎬';

  // Thread-type archives always get the Reddit-flavored post card,
  // even when a thumbnail was scraped. The card carries the post
  // title, subreddit, author and score — substantially more useful
  // than whatever generic preview image Reddit's API surfaced.
  // Falls back to a minimal layout when score/comment-count fields
  // are missing (older archives that pre-date those payload fields).
  if (a.type === 'thread') {
    thumb.appendChild(buildRedditPostCard(a));
  } else if (a.type === 'webpage' && !a.thumbnailSiaUrl && !a.thumbnailUrl) {
    thumb.appendChild(buildWebpageSnapshotCard(a));
  } else if (a.thumbnailSiaUrl || a.thumbnailUrl) {
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {
      img.remove();
      thumb.textContent = fallbackEmoji;
    };
    thumb.appendChild(img);
    loadThumbnailInto(a, img);
  } else {
    thumb.textContent = fallbackEmoji;
  }

  if (a.itemCount && a.itemCount > 1) {
    const stack = document.createElement('span');
    stack.className = 'thumb-stack';
    stack.textContent = `1 / ${a.itemCount}`;
    thumb.appendChild(stack);
  }
  if (a.type === 'video' || a.type === 'collection') {
    const play = document.createElement('span');
    play.className = 'thumb-play';
    play.textContent = '▶';
    thumb.appendChild(play);
  }
  if (a.hasThread && a.type !== 'thread') {
    const threadBadge = document.createElement('span');
    threadBadge.className = 'thumb-thread-badge';
    threadBadge.textContent = '💬';
    threadBadge.title = 'Includes archived thread + comments';
    thumb.appendChild(threadBadge);
  }

  const badge = document.createElement('span');
  badge.className = `platform-badge platform-badge-${platform}`;
  badge.textContent = platformLabel(platform);

  const meta = document.createElement('div');
  meta.className = 'entry-meta';
  const title = document.createElement('div');
  title.className = 'entry-title';
  title.textContent = a.title || a.sourceUrl || '(unknown)';
  meta.appendChild(title);
  if (a.handle) {
    const handleEl = document.createElement('div');
    handleEl.className = 'entry-handle';
    handleEl.textContent = a.handle;
    meta.appendChild(handleEl);
  }
  if (a.archivedAt) {
    const dateEl = document.createElement('div');
    dateEl.className = 'entry-date';
    dateEl.textContent = formatArchivedAt(a.archivedAt);
    dateEl.title = archivedAtTooltip(a.archivedAt);
    meta.appendChild(dateEl);
  }

  // Hover-revealed × button so the user can always remove an archive
  // even when its viewer is broken (synced-from-Sia entries with
  // missing fields, corrupt records, etc.). Without this, an entry
  // whose openViewer silently bails has no escape — it just sits in
  // the gallery forever.
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'entry-remove';
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove from library';
  removeBtn.setAttribute('aria-label', 'Remove from library');
  removeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm(
      `Remove "${a.title || a.sourceUrl || 'this archive'}"?\n\n` +
      'This unpins every Sia object the archive points to and deletes the local entry. ' +
      'The data is gone — anyone with the share link will get a fetch error.',
    )) return;
    removeBtn.disabled = true;
    removeBtn.textContent = '…';
    try {
      await purgeArchive(a);
    } catch (err) {
      console.warn('[ambrosia] purge from library tile failed:', err);
    }
    await renderLibrary();
  });

  li.appendChild(thumb);
  li.appendChild(badge);
  li.appendChild(meta);
  li.appendChild(removeBtn);

  li.addEventListener('click', () => openViewer(a));

  return li;
}

async function openWebpageInNewTab(entry) {
  // Open the tab synchronously inside the click event so popup
  // blockers don't bite. The async reconstruction happens after; we
  // navigate the pre-opened tab once the blob URL is ready.
  const newWin = window.open('about:blank', '_blank');
  if (!newWin) {
    // Popup blocked — fall back to the embedded viewer so the user
    // still gets to see their archive.
    openViewer(entry);
    return;
  }
  try {
    newWin.document.title = `Loading ${entry.title || 'archive'}…`;
    newWin.document.body.style.cssText = 'background:#0a0a0a;color:#9ca3af;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;';
    newWin.document.body.textContent = `Reconstructing archived page from Sia…`;
  } catch (_) { /* about:blank doc not yet writable in some browsers — fine */ }

  try {
    const manifestBlob = await downloadSiaBlobWithRetry(entry.siteManifestSiaUrl, 'application/json');
    const manifestFiles = parseSiteManifest(await manifestBlob.text());

    if (!manifestFiles['index.html']) {
      throw new Error('manifest has no index.html');
    }

    // Pull every file in parallel. Each non-html blob becomes a
    // blob: URL — these inherit OUR origin, and since the new tab
    // we pre-opened is same-origin (about:blank started here), it
    // can load all of them when the rewritten index.html navigates
    // it.
    const entries = Object.entries(manifestFiles);
    const fetched = await Promise.all(entries.map(async ([path, siaUrl]) => {
      const blob = await downloadSiaBlobWithRetry(siaUrl);
      return { path, blob };
    }));

    const blobUrls = new Map();
    let indexHtml = '';
    for (const f of fetched) {
      if (f.path === 'index.html') {
        indexHtml = await f.blob.text();
      } else {
        blobUrls.set(f.path, URL.createObjectURL(f.blob));
      }
    }

    let rewritten = indexHtml;
    for (const [path, blobUrl] of blobUrls) {
      rewritten = rewritten.split(path).join(blobUrl);
    }

    const htmlBlob = new Blob([rewritten], { type: 'text/html;charset=utf-8' });
    const htmlUrl = URL.createObjectURL(htmlBlob);

    if (newWin.closed) return; // user closed the tab while we were fetching
    newWin.location.replace(htmlUrl);
  } catch (err) {
    console.warn('[ambrosia] webpage new-tab open failed:', err);
    try {
      if (!newWin.closed) {
        newWin.document.body.textContent = `Couldn't reconstruct page: ${err.message || err}`;
      }
    } catch (_) {}
  }
}

// Builds the Reddit-flavored post card used as the library tile for
// text-only thread archives. Mirrors the structural conventions of a
// Reddit feed card — subreddit + score in the header, title clamped
// to a few lines, footer with author + relative time + comment count
// — so a Reddit user feels at home scanning the library grid.
function buildRedditPostCard(a) {
  const card = document.createElement('div');
  card.className = 'reddit-post-card';

  const header = document.createElement('div');
  header.className = 'reddit-post-card-header';
  const sub = document.createElement('span');
  sub.className = 'reddit-post-card-sub';
  sub.textContent = a.siteName || 'reddit';
  header.appendChild(sub);
  if (a.threadScore != null) {
    const score = document.createElement('span');
    score.className = 'reddit-post-card-score';
    score.textContent = `▲ ${formatRedditScore(a.threadScore)}`;
    header.appendChild(score);
  }
  card.appendChild(header);

  const title = document.createElement('div');
  title.className = 'reddit-post-card-title';
  // Title fallback chain: post title → page title → archive title →
  // path component of the source URL → finally "Reddit thread". The
  // last two cover synced archives whose JSON payload didn't carry a
  // post title; without them the card was visually empty.
  title.textContent = chooseRedditCardTitle(a);
  card.appendChild(title);

  const footerParts = [];
  if (a.author) footerParts.push(a.author);
  const postedRel = formatRelativeTime(a.threadCreatedUtc);
  if (postedRel) footerParts.push('posted ' + postedRel);
  if (footerParts.length) {
    const meta = document.createElement('div');
    meta.className = 'reddit-post-card-meta';
    meta.textContent = footerParts.join(' · ');
    card.appendChild(meta);
  }

  // Archived-at footer. Always present so the card carries the same
  // "when did I save this" information that the entry-meta hover
  // overlay would otherwise hide for non-hovered tiles.
  if (a.archivedAt) {
    const archived = document.createElement('div');
    archived.className = 'reddit-post-card-archived';
    archived.textContent = `archived ${formatRelativeTime(a.archivedAt)}`;
    archived.title = archivedAtTooltip(a.archivedAt);
    card.appendChild(archived);
  }

  if (a.threadCommentCount != null) {
    const comments = document.createElement('div');
    comments.className = 'reddit-post-card-comments';
    comments.textContent = `💬 ${formatRedditScore(a.threadCommentCount)} comments`;
    card.appendChild(comments);
  }

  return card;
}

function chooseRedditCardTitle(a) {
  if (a.title && a.title !== a.siteName) return a.title;
  if (a.pageTitle && a.pageTitle !== a.siteName) return a.pageTitle;
  // Pull the post slug out of the source URL (.../comments/<id>/<slug>/)
  // and humanise it. Reddit URL slugs are dash-separated lowercase, so
  // "scientology_speed_running_trend" → "Scientology speed running trend".
  try {
    const u = new URL(a.sourceUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('comments');
    if (idx >= 0 && parts.length > idx + 2) {
      const slug = parts[idx + 2].replace(/[-_]+/g, ' ').trim();
      if (slug) return slug.charAt(0).toUpperCase() + slug.slice(1);
    }
  } catch (_) {}
  return 'Reddit thread';
}

// Webpage-snapshot tile — minimal "we saved this whole page" card.
// Hostname header, page title in the body, file count + bundle size
// at the bottom. No live thumbnail, just a domain-coloured plain card.
function buildWebpageSnapshotCard(a) {
  const card = document.createElement('div');
  card.className = 'webpage-snapshot-card';

  const header = document.createElement('div');
  header.className = 'webpage-snapshot-host';
  header.textContent = a.siteName || safeHostnameOf(a.sourceUrl) || 'webpage';
  card.appendChild(header);

  const title = document.createElement('div');
  title.className = 'webpage-snapshot-title';
  title.textContent = a.title || a.pageTitle || a.sourceUrl || '(no title)';
  card.appendChild(title);

  const footerParts = [];
  if (a.siteFileCount != null) footerParts.push(`${a.siteFileCount} file${a.siteFileCount === 1 ? '' : 's'}`);
  if (a.siteBundleBytes != null) footerParts.push(formatBytes(a.siteBundleBytes));
  if (footerParts.length) {
    const footer = document.createElement('div');
    footer.className = 'webpage-snapshot-meta';
    footer.textContent = footerParts.join(' · ');
    card.appendChild(footer);
  }

  return card;
}

// Reddit-style abbreviated score: 1495 → "1.5k", 12345 → "12k".
function formatRedditScore(n) {
  if (n == null || !Number.isFinite(Number(n))) return '';
  const v = Number(n);
  if (Math.abs(v) >= 10000) return `${Math.round(v / 1000)}k`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

// "2h ago", "3d ago", "1y ago" — accepts a unix-seconds timestamp or
// any value parseable by Date.parse. Returns '' for invalid input.
function formatRelativeTime(timestamp) {
  if (timestamp == null) return '';
  const t = typeof timestamp === 'number'
    ? (timestamp > 1e12 ? timestamp : timestamp * 1000)
    : Date.parse(timestamp);
  if (!Number.isFinite(t)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return 'just now';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  const year = Math.floor(day / 365);
  return `${year}y ago`;
}

// --- Platform detection + per-site metadata helpers ---

function detectPlatform(sourceUrl) {
  const u = safeUrl(sourceUrl);
  if (!u) return 'default';
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  if (isDirectMediaHost(host)) return 'default';
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'instagram';
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok';
  if (host === 'twitter.com' || host === 'x.com' || host.endsWith('.twitter.com')) return 'twitter';
  if (host === 'facebook.com' || host.endsWith('.facebook.com')) return 'facebook';
  if (host === 'reddit.com' || host.endsWith('.reddit.com')) return 'reddit';
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) return 'vimeo';
  if (host === 'twitch.tv' || host.endsWith('.twitch.tv') || host === 'clips.twitch.tv') return 'twitch';
  if (host === 'bsky.app' || host.endsWith('.bsky.app')) return 'bluesky';
  return 'default';
}

function isDirectMediaHost(host) {
  return host === 'pximg.net' || host.endsWith('.pximg.net');
}

function platformLabel(p) {
  return ({
    instagram: 'Instagram',
    tiktok: 'TikTok',
    twitter: 'X',
    facebook: 'Facebook',
    reddit: 'Reddit',
    vimeo: 'Vimeo',
    twitch: 'Twitch',
    bluesky: 'Bluesky',
    default: 'Web',
  })[p] || 'Web';
}

function extractHandle(platform, sourceUrl) {
  const u = safeUrl(sourceUrl);
  if (!u) return null;
  const segs = u.pathname.split('/').filter(Boolean);
  switch (platform) {
    case 'instagram':
    case 'tiktok':
      // tiktok: /@user/video/X — instagram: /username/, /p/<shortcode>/
      if (segs[0]?.startsWith('@')) return segs[0];
      if (segs[0] && !['p', 'reel', 'tv', 'video'].includes(segs[0])) return '@' + segs[0];
      return null;
    case 'twitter':
      if (segs[0] && segs[0] !== 'i') return '@' + segs[0];
      return null;
    case 'facebook':
      if (segs[0] === 'share') return 'Facebook';
      if (segs[0] && segs[0] !== 'watch' && segs[0] !== 'reel' && segs[0] !== 'share') return segs[0];
      return null;
    case 'reddit':
      if (segs[0] === 'r' && segs[1]) return 'r/' + segs[1];
      return null;
    case 'twitch':
      if (segs[0] && segs[0] !== 'videos') return segs[0];
      return null;
    case 'bluesky':
      if (segs[0] === 'profile' && segs[1]) return '@' + segs[1];
      return null;
    default:
      return null;
  }
}

function safeUrl(s) {
  try { return new URL(s); } catch { return null; }
}

function isDirectMediaUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const ext = u.pathname.split('.').pop()?.toLowerCase();
    return /^(jpg|jpeg|png|webp|gif|avif|mp4|webm|mov|m4v|mp3|m4a|ogg)$/.test(ext || '');
  } catch { return false; }
}

function emptyPageMeta() {
  return { pageTitle: null, caption: null, author: null, siteName: null, thumbnailUrl: null, extra: null };
}

function pageMetaForArchive(sourceUrl, items) {
  if (isDirectMediaUrl(sourceUrl)) return Promise.resolve(emptyPageMeta());
  if (items?.some((item) => item?._galleryDl)) {
    return Promise.resolve(pageMetaFromGalleryDl(items));
  }
  return scrapePageMeta(sourceUrl);
}

function pageMetaFromGalleryDl(items) {
  const metaItem = items.find((item) => item?._galleryDl?.title || item?._galleryDl?.author)?._galleryDl;
  if (!metaItem) return emptyPageMeta();
  return {
    ...emptyPageMeta(),
    pageTitle: metaItem.title || null,
    author: metaItem.author || null,
  };
}

// Cobalt's filenames look like "Title (1080p, h264).mp4". Strip the
// extension and the trailing quality/codec parens so the library shows
// just the title.
function cleanTitle(filename) {
  if (!filename) return null;
  let t = filename.replace(/\.(mp4|webm|mov|m4a|mp3|ogg|jpg|jpeg|png|gif|webp|opus)$/i, '');
  t = t.replace(/\s*\(\s*[^()]*?\d+\s*p[^()]*?\)\s*$/i, '');
  t = t.replace(/\s*\([^()]*?\b(h264|h265|vp9|av1|aac|opus|hevc|webm|mp4)\b[^()]*?\)\s*$/i, '');
  return t.trim() || null;
}

// Progress component: a single card that reflects the current upload phase.
// Three modes:
//   - indeterminate: show a sliding bar (Cobalt extraction, SDK setup, retries)
//   - determinate: show a real percent (per-file byte upload)
//   - terminal: success (green flash, fades out) or error (red, sticks)

function clearProgress() {
  progressEl.classList.add('hidden');
  progressEl.classList.remove('busy', 'done', 'fail', 'indeterminate');
  progressFill.style.width = '0%';
  progressTitle.textContent = '';
  progressCounter.textContent = '';
  progressDetail.textContent = '';
}

function showIndeterminate(title, detail = '') {
  progressEl.classList.remove('hidden', 'done', 'fail');
  progressEl.classList.add('busy', 'indeterminate');
  progressTitle.textContent = title;
  progressCounter.textContent = '';
  progressDetail.textContent = detail;
}

function showDeterminate(title, counter, percent, detail = '') {
  progressEl.classList.remove('hidden', 'done', 'fail', 'indeterminate');
  progressEl.classList.add('busy');
  progressTitle.textContent = title;
  progressCounter.textContent = counter;
  progressDetail.textContent = detail;
  progressFill.style.width = Math.max(0, Math.min(100, percent)).toFixed(1) + '%';
}

function showDone(title) {
  progressEl.classList.remove('hidden', 'busy', 'fail', 'indeterminate');
  progressEl.classList.add('done');
  progressTitle.textContent = title;
  progressFill.style.width = '100%';
  setTimeout(() => clearProgress(), 1800);
}

function showFail(err) {
  progressEl.classList.remove('hidden', 'busy', 'done', 'indeterminate');
  progressEl.classList.add('fail');
  progressTitle.textContent = 'Error';
  progressCounter.textContent = '';
  progressDetail.textContent = err.message || String(err);
}

// Single-URL failure UX: replace the bare error text with a card that
// (a) shows the matched supported-site card with sample URLs when we
// can identify the platform, and (b) offers a "Try webpage snapshot"
// last-resort button that re-runs the upload pipeline with the
// extractor-bypass flag set. Falls back to the simple progress error
// when neither remediation applies (e.g. the snapshot itself failed).
function showFailWithRecovery(err, sourceUrl) {
  const card = document.getElementById('fail-card');
  const messageEl = document.getElementById('fail-card-message');
  const siteEl = document.getElementById('fail-card-site');
  const snapshotBtn = document.getElementById('fail-card-snapshot');
  if (!card || !messageEl || !siteEl || !snapshotBtn) {
    showFail(err);
    return;
  }
  // Hide the in-progress strip — the card replaces it as the active
  // surface for this URL.
  progressEl.classList.add('hidden');
  card.classList.remove('hidden');
  messageEl.textContent = err?.message || String(err);

  const matched = findSupportedSiteForUrl(sourceUrl);
  siteEl.replaceChildren();
  if (matched) {
    const heading = document.createElement('div');
    heading.className = 'fail-card-site-heading';
    heading.textContent = `Looks like ${displayGalleryDlSiteName(matched)} — try one of these URL shapes:`;
    siteEl.appendChild(heading);
    siteEl.appendChild(renderSupportedSiteResult(matched));
    siteEl.classList.remove('hidden');
  } else {
    siteEl.classList.add('hidden');
  }

  const isAlreadySnapshot = err?.message && /webpage snapshot/i.test(err.message);
  // The snapshot path also runs through captureWebpage, so if that's
  // the layer that just failed, offering it again is misleading.
  snapshotBtn.disabled = isAlreadySnapshot || !isExtensionInstalled();
  snapshotBtn.textContent = isAlreadySnapshot
    ? 'Webpage snapshot already failed'
    : !isExtensionInstalled()
      ? 'Webpage snapshot needs the Ambrosia extension'
      : 'Try webpage snapshot';
  snapshotBtn.onclick = () => {
    pendingSubmitOpts.set(sourceUrl, { forceWebpageSnapshot: true });
    urlInput.value = sourceUrl;
    hideFailCard();
    form.requestSubmit();
  };
}

function hideFailCard() {
  document.getElementById('fail-card')?.classList.add('hidden');
}

document.getElementById('fail-card-dismiss')?.addEventListener('click', hideFailCard);

// "Use" buttons on the matched-site card inside the failure card
// share the same `data-example-url` attribute as the supported-sites
// modal. Clicking one swaps the URL input to that example so the user
// can immediately retry with a known-good URL shape.
document.getElementById('fail-card-site')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-example-url]');
  if (!btn) return;
  const exampleUrl = btn.getAttribute('data-example-url');
  if (!exampleUrl) return;
  urlInput.value = exampleUrl;
  hideFailCard();
  requestAnimationFrame(() => {
    try { urlInput.focus(); urlInput.select(); } catch (_) {}
  });
});

// Match a URL against the supported-sites list by hostname. Walks
// host suffixes so foo.tumblr.com still matches a site entry whose
// host is "tumblr.com". Returns null when nothing matches.
function findSupportedSiteForUrl(url) {
  const host = safeHostnameOf(url);
  if (!host) return null;
  const candidates = safeSupportedSites();
  // Prefer the longest matching host suffix — site entries are
  // sometimes registered under a parent domain, sometimes under a
  // subdomain, and the most-specific match wins.
  let best = null;
  for (const site of candidates) {
    const siteHost = String(site.host || '').toLowerCase();
    if (!siteHost) continue;
    if (host === siteHost || host.endsWith('.' + siteHost)) {
      if (!best || siteHost.length > String(best.host || '').length) best = site;
    }
  }
  return best;
}

// Cache decrypted thumbnail blob URLs so the library doesn't re-download
// from Sia on every render. Keyed by the share URL; entries live for the
// page session (the SDK reconstructs them anyway after a reload).
const thumbBlobCache = new Map();

async function rememberThumbBlob(cacheKey, blob) {
  if (!cacheKey || !(blob instanceof Blob)) return null;
  let blobUrl = thumbBlobCache.get(cacheKey);
  if (!blobUrl) {
    blobUrl = URL.createObjectURL(blob);
    thumbBlobCache.set(cacheKey, blobUrl);
  }
  setCachedThumb(cacheKey, blob);
  return blobUrl;
}

async function loadExternalThumbnailBlobUrl(entry) {
  if (!entry.thumbnailUrl) return null;
  if (/^blob:/i.test(entry.thumbnailUrl)) return entry.thumbnailUrl;

  const cacheKey = entry.thumbnailSiaUrl || `thumb:${entry.thumbnailUrl}`;
  const memoized = thumbBlobCache.get(cacheKey);
  if (memoized) return memoized;

  const cachedBlob = await getCachedThumb(cacheKey);
  if (cachedBlob) return await rememberThumbBlob(cacheKey, cachedBlob);

  if (!isExtensionInstalled()) await waitForExtension(150);
  if (!isExtensionInstalled()) return null;

  try {
    const { blob } = await fetchBytesViaExtension(entry.thumbnailUrl);
    return await rememberThumbBlob(cacheKey, blob);
  } catch (err) {
    console.warn('[ambrosia] extension thumbnail fetch failed:', err);
    return null;
  }
}

async function loadThumbnailInto(entry, imgEl) {
  // Three tiers of cache, fastest to slowest:
  //   1. In-memory blob URL (this page session, instant)
  //   2. IndexedDB blob (persists across reloads, ~5-50ms)
  //   3. Sia SDK download (cold, ~hundreds of ms; populates the IDB cache)
  if (entry.thumbnailSiaUrl) {
    try {
      let blobUrl = thumbBlobCache.get(entry.thumbnailSiaUrl);
      if (!blobUrl) {
        // Try IDB before reaching for the SDK.
        const cachedBlob = await getCachedThumb(entry.thumbnailSiaUrl);
        if (cachedBlob) {
          blobUrl = await rememberThumbBlob(entry.thumbnailSiaUrl, cachedBlob);
        } else {
          const blob = await downloadSiaBlobWithRetry(entry.thumbnailSiaUrl);
          blobUrl = await rememberThumbBlob(entry.thumbnailSiaUrl, blob);
        }
      }
      imgEl.src = blobUrl;
      return;
    } catch (err) {
      console.warn('[ambrosia] sia thumbnail download failed, falling back:', err);
      // Fall through to external below.
    }
  }
  if (entry.thumbnailUrl) {
    const blobUrl = await loadExternalThumbnailBlobUrl(entry);
    if (blobUrl) {
      imgEl.src = blobUrl;
      return;
    }
    imgEl.src = entry.thumbnailUrl;
  } else {
    // No source at all — trigger the fallback emoji via the error handler.
    imgEl.dispatchEvent(new Event('error'));
  }
}

// Per-item thumbnail grid. Renders the moment Cobalt returns the picker —
// before any upload starts — so the user can immediately see what they're
// archiving. Each tile transitions through pending → uploading → done.

function renderBatch(items) {
  batchTilesEl.innerHTML = '';
  if (!items || items.length === 0) {
    batchEl.classList.add('hidden');
    return;
  }
  batchEl.classList.remove('hidden');
  items.forEach((item, idx) => {
    const tile = document.createElement('div');
    tile.className = 'batch-tile';
    tile.dataset.state = 'pending';
    tile.dataset.index = String(idx);
    // Stagger entrance so the grid pops in instead of slamming in at once.
    tile.style.animationDelay = `${Math.min(idx * 25, 400)}ms`;

    if (item.thumbnailUrl) {
      const img = document.createElement('img');
      img.src = item.thumbnailUrl;
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer'; // some CDNs block hot-linking with referer
      img.onerror = () => {
        img.replaceWith(buildFallback(item));
      };
      tile.appendChild(img);
    } else {
      tile.appendChild(buildFallback(item));
    }

    const badge = document.createElement('div');
    badge.className = 'tile-badge';
    badge.textContent = String(idx + 1);
    tile.appendChild(badge);

    const bar = document.createElement('div');
    bar.className = 'tile-bar';
    const fill = document.createElement('div');
    fill.className = 'tile-fill';
    bar.appendChild(fill);
    tile.appendChild(bar);

    batchTilesEl.appendChild(tile);
  });
}

function buildFallback(item) {
  const span = document.createElement('div');
  span.className = 'tile-fallback';
  span.textContent =
    item.kind === 'photo' ? '🖼' :
    item.kind === 'audio' ? '🎵' :
    '🎬';
  return span;
}

// Drop a real thumbnail into a batch tile that originally rendered with
// just the fallback emoji. Used by the parallel thumbnail-discovery
// hydration so the user sees a preview within seconds of submitting,
// not after the upload finishes.
function hydrateBatchTileThumb(idx, url) {
  const tile = batchTilesEl.querySelector(`.batch-tile[data-index="${idx}"]`);
  if (!tile) return;
  if (tile.querySelector('img')) return;     // already has a thumbnail
  const fallback = tile.querySelector('.tile-fallback');
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.onerror = () => { img.remove(); };
  // Insert before badge/bar so they stay on top.
  tile.insertBefore(img, tile.firstChild);
  if (fallback) fallback.remove();
}

function setTileState(idx, state, percent) {
  const tile = batchTilesEl.querySelector(`.batch-tile[data-index="${idx}"]`);
  if (!tile) return;
  tile.dataset.state = state;
  if (typeof percent === 'number') {
    const fill = tile.querySelector('.tile-fill');
    if (fill) fill.style.width = Math.max(0, Math.min(100, percent)).toFixed(1) + '%';
  }
  if (state === 'done') {
    const badge = tile.querySelector('.tile-badge');
    if (badge) badge.textContent = '✓';
  } else if (state === 'error') {
    const badge = tile.querySelector('.tile-badge');
    if (badge) badge.textContent = '!';
  }
}

function clearBatch() {
  batchEl.classList.add('hidden');
  batchTilesEl.innerHTML = '';
}

function showResult(record) {
  resultCard.classList.remove('hidden');
  const platform = record.platform || detectPlatform(record.sourceUrl) || 'default';
  const label = platformLabel(platform);
  const title = chooseViewerTitle(record);
  const count = record.itemCount || record.files?.filter((f) => f.role !== 'audio').length || 1;
  const noun = count === 1 ? 'item' : 'items';
  const compactTitle = title && title !== record.sourceUrl
    ? (title.length > 68 ? title.slice(0, 65) + '…' : title)
    : null;
  resultSubtitle.textContent = compactTitle
    ? `${compactTitle} · ${count} ${noun} saved`
    : `${label} saved · ${count} ${noun}`;
  resultCard.setAttribute('aria-label', `Archived ${title}`);
}

resultDone.addEventListener('click', () => {
  resultCard.classList.add('hidden');
  clearBatch();
  clearProgress();
  closeAddModal();
});

document.getElementById('library-sync').addEventListener('click', async () => {
  const btn = document.getElementById('library-sync');
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = 'Syncing…';
  try {
    await syncLibraryInBackground({ replace: true });
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
});

// --- Viewer / lightbox ---

const viewer = document.getElementById('viewer');
const viewerStage = document.getElementById('viewer-stage');
const viewerTitle = document.getElementById('viewer-title');
const viewerCounter = document.getElementById('viewer-counter');
const viewerDots = document.getElementById('viewer-dots');
const MAX_DOTS = 12; // Beyond this, dots get cramped; counter pill alone suffices.
const viewerPrev = document.getElementById('viewer-prev');
const viewerNext = document.getElementById('viewer-next');
const viewerShare = document.getElementById('viewer-share');
const viewerSource = document.getElementById('viewer-source');
const viewerRemove = document.getElementById('viewer-remove');

let viewerState = null; // { entry, files, idx, blobUrls, archives, archiveIdx }

const viewerFeedPrev = document.getElementById('viewer-feed-prev');
const viewerFeedNext = document.getElementById('viewer-feed-next');

async function openViewer(entry) {
  // Load the full library so we know what's above and below in the
  // feed. The cost is one localStorage read per open — negligible.
  const archives = await listArchives();
  const archiveIdx = Math.max(0, archives.findIndex((a) => a.id === entry.id));
  await renderViewerForEntry(entry, archives, archiveIdx, { firstOpen: true });
}

// Re-renders the viewer for a (possibly different) archive in the feed.
// Used both by openViewer (first open, push history) and by feed
// navigation (swap to prev/next archive without pushing history).
async function renderViewerForEntry(entry, archives, archiveIdx, { firstOpen = false } = {}) {
  // Build the file list to walk through. Skip audio (no useful viewer
  // UI), thread (renders separately in the viewer-thread section,
  // not as a media slide), and site-* roles (those are reconstructed
  // as a webpage iframe by renderViewerStage when type='webpage').
  const files = (entry.files && entry.files.length ? entry.files : [{
    role: entry.type,
    siaUrl: entry.siaUrl,
    mimeType: entry.mimeType,
  }]).filter((f) => f.siaUrl
    && f.role !== 'audio'
    && f.role !== 'thread'
    && f.role !== 'site-manifest'
    && f.role !== 'site-file');

  // Reddit-style: when an archive has both media and an attached thread,
  // append a synthetic "thread" slide so the carousel walks media → comments.
  // Text-only threads keep the dedicated viewer-thread card path below.
  if (entry.hasThread && entry.threadSiaUrl && files.length > 0) {
    files.push({ role: 'thread-slide', siaUrl: null });
  }

  // For text-only thread / webpage archives we proceed with files=[] —
  // the thread section / webpage iframe becomes the primary content
  // and the media stage either shows a friendly empty-state or is
  // hidden entirely. Bail early only if there's truly nothing to
  // show. "Truly nothing" means: no playable media, no thread, no
  // webpage snapshot, AND no thread-shaped file in the unfiltered
  // record (which catches synced-from-Sia thread archives whose
  // `hasThread` flag wasn't set by older sync runs).
  const hasAnyThreadFile = (entry.files || []).some((f) => f?.role === 'thread' && f?.siaUrl);
  const hasAnySiaUrl = !!entry.siaUrl || !!entry.threadSiaUrl || !!entry.siteManifestSiaUrl
    || (entry.files || []).some((f) => f?.siaUrl);
  if (files.length === 0
      && !entry.hasThread
      && !hasAnyThreadFile
      && entry.type !== 'thread'
      && entry.type !== 'webpage'
      && !hasAnySiaUrl) {
    console.warn('[ambrosia] openViewer bailing — no renderable content for entry', entry.id, entry);
    return;
  }
  // Synced-archive recovery: the thread file is on Sia but the record's
  // top-level `hasThread`/`threadSiaUrl` weren't promoted by older
  // sync runs. Promote them in-memory so the viewer's thread-rendering
  // paths see them. We don't touch `type` — a mixed media+thread
  // archive incorrectly classified as 'collection' will still render
  // its carousel correctly; the post card just becomes available too.
  if (!entry.hasThread && hasAnyThreadFile) {
    const threadFile = (entry.files || []).find((f) => f?.role === 'thread' && f?.siaUrl);
    entry = { ...entry, hasThread: true, threadSiaUrl: threadFile.siaUrl };
  }

  // If we're navigating between archives, free the previous archive's
  // blob URLs so memory doesn't accumulate across a long feed scroll.
  if (viewerState && !firstOpen) {
    for (const url of viewerState.blobUrls.values()) {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }
  }

  viewerState = { entry, files, idx: 0, blobUrls: new Map(), archives, archiveIdx };
  viewerRemove.disabled = false;
  viewerRemove.textContent = 'Remove';
  viewerShare.disabled = false;
  viewerShare.textContent = 'Share';
  // Prefer scraped page title, then caption (truncated), then the URL —
  // never the raw Cobalt filename, which is always uglier than the URL.
  viewerTitle.textContent = chooseViewerTitle(entry);
  viewerSource.href = entry.sourceUrl || '#';
  renderViewerPost(entry);
  // For text-only thread archives the Reddit post card below carries
  // the same fields renderViewerPost would surface (subreddit, author,
  // title, archive timestamp). Suppress the post block to avoid showing
  // the same data twice — the card is the canonical view.
  const isTextThread = entry.type === 'thread' && (!entry.files || entry.files.length === 0);
  if (isTextThread) {
    document.getElementById('viewer-post').classList.add('hidden');
  }
  // Hide the top title bar when the post block is going to show
  // site/author/caption — avoids the "Instagram / Instagram" stack.
  const postShown = !document.getElementById('viewer-post').classList.contains('hidden');
  document.querySelector('.viewer-header').classList.toggle('compact', postShown || isTextThread);
  renderFeedPeeks();
  // Start downloading the primary media for ±2 adjacent archives so
  // feed navigation is instant. Fire-and-forget — survives this
  // viewer's lifetime via the module-level adjacentMediaCache.
  prefetchAdjacentArchives();

  if (firstOpen) {
    viewer.classList.remove('hidden');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    pushOverlayHistory('viewer');
  }
  renderViewerStage();
  renderViewerThread(entry);
}

// Per-archive cache for fetched-and-parsed thread payloads. Cleared
// when the archive is removed; otherwise survives the page session so
// re-opening an archive doesn't re-download the thread JSON.
const threadJsonCache = new Map();

function renderViewerThread(entry) {
  const threadEl = document.getElementById('viewer-thread');
  threadEl.innerHTML = '';
  if (!entry.hasThread || !entry.threadSiaUrl) {
    threadEl.classList.add('hidden');
    return;
  }

  // Media-bearing thread archives now expose the comments as the last
  // carousel slide, so the supplementary card under the stage would
  // duplicate it. Only render the dedicated section for text-only threads
  // where the card IS the primary content.
  const isPrimaryContent = !entry.files || entry.files.length === 0
    || !viewerState?.files?.some((f) => f.siaUrl);
  if (!isPrimaryContent) {
    threadEl.classList.add('hidden');
    return;
  }
  threadEl.classList.remove('hidden');
  threadEl.classList.add('viewer-thread-primary');

  threadEl.appendChild(buildThreadButton(entry));
}

// Builds the clickable Reddit post card used both in the dedicated
// viewer-thread section (for text-only threads) and as a synthetic
// "thread" carousel slide (for media-bearing threads).
function buildThreadButton(entry) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'viewer-thread-button';
  button.appendChild(buildRedditPostCard(entry));

  const hint = document.createElement('div');
  hint.className = 'viewer-thread-hint';
  hint.textContent = 'Click to read full thread →';
  button.appendChild(hint);

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    button.classList.add('loading');
    hint.textContent = 'Loading archived thread from Sia…';

    let promise = threadJsonCache.get(entry.id);
    if (!promise) {
      promise = (async () => {
        const blob = await downloadSiaBlobWithRetry(entry.threadSiaUrl, 'application/json');
        const text = await blob.text();
        return JSON.parse(text);
      })();
      threadJsonCache.set(entry.id, promise);
    }

    try {
      const thread = await promise;
      button.disabled = false;
      button.classList.remove('loading');
      hint.textContent = 'Click to read full thread →';
      openThreadReader(thread, entry);
    } catch (err) {
      threadJsonCache.delete(entry.id);
      button.disabled = false;
      button.classList.remove('loading');
      hint.textContent = `Couldn't load: ${err.message || err}`;
      hint.classList.add('viewer-thread-hint-error');
    }
  });

  return button;
}

// Full thread reader — overlays the viewer with an old.reddit.com-flavored
// reader: post header, body, then the threaded comment tree with depth
// indicators. Opens with pushOverlayHistory so the browser back button
// returns to the viewer (rather than navigating away from ambrosia).
function openThreadReader(thread, entry) {
  const reader = document.getElementById('thread-reader');
  const content = document.getElementById('thread-reader-content');
  const titleEl = document.getElementById('thread-reader-title');
  if (!reader || !content) return;

  content.innerHTML = '';
  content.appendChild(buildOldRedditReaderDOM(thread, entry));
  titleEl.textContent = thread.post?.subreddit || 'Reddit';
  // Reset scroll on every open so a fresh thread starts at the top
  // instead of inheriting the previous one's scroll position.
  content.scrollTop = 0;

  reader.classList.remove('hidden');
  reader.setAttribute('aria-hidden', 'false');
  pushOverlayHistory('thread-reader');
}

function closeThreadReader() {
  const reader = document.getElementById('thread-reader');
  if (!reader || reader.classList.contains('hidden')) return;
  if (history.state?.ambrosiaOverlay === 'thread-reader') {
    history.back();
    return;
  }
  closeThreadReaderDOM();
}

function closeThreadReaderDOM() {
  const reader = document.getElementById('thread-reader');
  if (!reader) return;
  reader.classList.add('hidden');
  reader.setAttribute('aria-hidden', 'true');
}

document.getElementById('thread-reader-back')?.addEventListener('click', closeThreadReader);
document.getElementById('thread-reader-close')?.addEventListener('click', closeThreadReader);
document.getElementById('thread-reader')?.addEventListener('click', (e) => {
  // Click on the backdrop (outside the content panel) closes the reader.
  // Inside-content clicks are absorbed normally by their handlers.
  if (e.target === e.currentTarget) closeThreadReader();
});

function buildOldRedditReaderDOM(thread, entry) {
  const root = document.createElement('div');
  root.className = 'reader-root';

  if (thread.post) {
    const post = document.createElement('article');
    post.className = 'reader-post';

    if (thread.post.title) {
      const titleEl = document.createElement('h1');
      titleEl.className = 'reader-post-title';
      titleEl.textContent = thread.post.title;
      post.appendChild(titleEl);
    }

    const meta = document.createElement('div');
    meta.className = 'reader-post-meta';
    if (thread.post.score != null) {
      const score = document.createElement('span');
      score.className = 'reader-post-score';
      score.textContent = `${thread.post.score} pts`;
      meta.appendChild(score);
    }
    const submittedBy = document.createElement('span');
    submittedBy.className = 'reader-post-submitted';
    submittedBy.append('submitted by ');
    if (thread.post.author) {
      const a = document.createElement('a');
      a.className = 'reader-author';
      a.textContent = `u/${thread.post.author}`;
      a.href = `https://reddit.com/user/${thread.post.author}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      submittedBy.appendChild(a);
    }
    if (thread.post.subreddit) {
      submittedBy.append(' to ');
      const s = document.createElement('a');
      s.className = 'reader-sub';
      s.textContent = thread.post.subreddit;
      s.href = `https://reddit.com/${thread.post.subreddit}`;
      s.target = '_blank';
      s.rel = 'noopener noreferrer';
      submittedBy.appendChild(s);
    }
    meta.appendChild(submittedBy);
    if (entry?.archivedAt) {
      const ar = document.createElement('span');
      ar.className = 'reader-post-archived';
      ar.textContent = `archived ${formatArchivedAt(entry.archivedAt)}`;
      meta.appendChild(ar);
    }
    post.appendChild(meta);

    if (thread.post.selftext) {
      const body = document.createElement('div');
      body.className = 'reader-post-body';
      renderRedditMarkdownInto(body, thread.post.selftext);
      post.appendChild(body);
    }

    root.appendChild(post);
  }

  const totalComments = thread.post?.num_comments;
  const archivedCount = thread.comments?.length || 0;
  const commentsHeader = document.createElement('div');
  commentsHeader.className = 'reader-comments-header';
  commentsHeader.textContent = totalComments != null
    ? `top ${archivedCount} of ${totalComments} comments`
    : `${archivedCount} comments`;
  root.appendChild(commentsHeader);

  if (archivedCount > 0) {
    const list = document.createElement('ul');
    list.className = 'reader-comments';
    for (const c of thread.comments) {
      list.appendChild(buildOldRedditCommentDOM(c, 0));
    }
    root.appendChild(list);
  }

  return root;
}

function buildOldRedditCommentDOM(comment, depth) {
  const li = document.createElement('li');
  li.className = `reader-comment depth-${Math.min(depth, 6)}`;

  const meta = document.createElement('div');
  meta.className = 'reader-comment-meta';
  const author = document.createElement('a');
  author.className = `reader-comment-author${comment.is_op ? ' is-op' : ''}`;
  author.textContent = `u/${comment.author}`;
  author.href = `https://reddit.com/user/${comment.author}`;
  author.target = '_blank';
  author.rel = 'noopener noreferrer';
  meta.appendChild(author);
  if (comment.score != null) {
    const score = document.createElement('span');
    score.className = 'reader-comment-score';
    score.textContent = `${comment.score} pt${comment.score === 1 ? '' : 's'}`;
    meta.appendChild(score);
  }
  if (comment.distinguished) {
    const tag = document.createElement('span');
    tag.className = `reader-comment-tag tag-${comment.distinguished}`;
    tag.textContent = comment.distinguished;
    meta.appendChild(tag);
  }
  li.appendChild(meta);

  const body = document.createElement('div');
  body.className = 'reader-comment-body';
  renderRedditMarkdownInto(body, comment.body);
  li.appendChild(body);

  if (comment.replies?.length) {
    const sublist = document.createElement('ul');
    sublist.className = 'reader-comments';
    for (const r of comment.replies) {
      sublist.appendChild(buildOldRedditCommentDOM(r, depth + 1));
    }
    li.appendChild(sublist);
  }
  return li;
}

// Minimal Reddit markdown renderer. Handles the cases that account for
// 95%+ of comment content: paragraphs (blank-line separated), bold
// (**), italic (* or _), inline code (`), explicit links [text](url),
// block quotes (lines starting with >), and bare URL auto-linking.
// Skips tables and complex lists — those are uncommon in comments and
// the cost of a full CommonMark library isn't worth the marginal gain.
function renderRedditMarkdownInto(target, text) {
  if (!text) return;
  const paragraphs = String(text).split(/\n{2,}/);
  for (const para of paragraphs) {
    if (!para.trim()) continue;
    if (para.trim().startsWith('>')) {
      const bq = document.createElement('blockquote');
      bq.className = 'thread-md-blockquote';
      const stripped = para.split('\n').map((line) => line.replace(/^>\s?/, '')).join('\n');
      renderInlineMarkdown(bq, stripped);
      target.appendChild(bq);
    } else {
      const p = document.createElement('p');
      renderInlineMarkdown(p, para);
      target.appendChild(p);
    }
  }
}

function renderInlineMarkdown(target, text) {
  const lines = String(text).split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) target.appendChild(document.createElement('br'));
    appendInlineTokens(target, lines[i]);
  }
}

const INLINE_MD_RX = /\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*(.+?)\*\*|(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])|(?<![_\w])_(?!\s)(.+?)(?<!\s)_(?![_\w])|(https?:\/\/[^\s<>)]+)/;

function appendInlineTokens(target, text) {
  let cursor = 0;
  while (cursor < text.length) {
    const slice = text.slice(cursor);
    const m = slice.match(INLINE_MD_RX);
    if (!m) {
      target.appendChild(document.createTextNode(slice));
      return;
    }
    if (m.index > 0) {
      target.appendChild(document.createTextNode(slice.slice(0, m.index)));
    }
    if (m[1] != null) {
      const a = document.createElement('a');
      a.href = m[2];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = m[1];
      target.appendChild(a);
    } else if (m[3] != null) {
      const c = document.createElement('code');
      c.textContent = m[3];
      target.appendChild(c);
    } else if (m[4] != null) {
      const b = document.createElement('strong');
      b.textContent = m[4];
      target.appendChild(b);
    } else if (m[5] != null) {
      const it = document.createElement('em');
      it.textContent = m[5];
      target.appendChild(it);
    } else if (m[6] != null) {
      const it = document.createElement('em');
      it.textContent = m[6];
      target.appendChild(it);
    } else if (m[7] != null) {
      const a = document.createElement('a');
      a.href = m[7];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = m[7];
      target.appendChild(a);
    }
    cursor += m.index + m[0].length;
  }
}

// Show the prev/next archive's thumbnails as small buttons at the top
// and bottom of the stage. Same affordance as Instagram Reels' "next
// video preview." Click or swipe vertically to navigate.
function renderFeedPeeks() {
  if (!viewerState) return;
  const { archives, archiveIdx } = viewerState;
  const prev = archiveIdx > 0 ? archives[archiveIdx - 1] : null;
  const next = archiveIdx < archives.length - 1 ? archives[archiveIdx + 1] : null;
  hydratePeek(viewerFeedPrev, prev);
  hydratePeek(viewerFeedNext, next);
}

function hydratePeek(btn, entry) {
  if (!btn) return;
  btn.classList.toggle('hidden', !entry);
  if (!entry) return;
  const img = btn.querySelector('.viewer-peek-thumb');
  if (!img) return;
  img.removeAttribute('src');
  // Use the existing thumbnail-loading machinery so cached blobs from
  // the gallery render are reused. loadThumbnailInto handles Sia
  // download + IDB cache + in-memory cache.
  loadThumbnailInto(entry, img);
}

async function feedNavigate(direction) {
  if (!viewerState) return;
  const { archives, archiveIdx } = viewerState;
  const targetIdx = archiveIdx + direction;
  if (targetIdx < 0 || targetIdx >= archives.length) return;
  await renderViewerForEntry(archives[targetIdx], archives, targetIdx);
}

viewerFeedPrev.addEventListener('click', (e) => {
  e.preventDefault();
  feedNavigate(-1);
});
viewerFeedNext.addEventListener('click', (e) => {
  e.preventDefault();
  feedNavigate(1);
});

// Detect bot-shell page titles like "Instagram" / "Facebook" / "X"
// served by login-walled platforms to anonymous scrapers. These are
// always identical to the platform name and never carry real info.
function isBotShellTitle(title, entry) {
  if (!title) return true;
  const t = title.trim();
  const platformName = platformLabel(entry.platform || detectPlatform(entry.sourceUrl) || 'default');
  return t === platformName || t === entry.siteName;
}

function chooseViewerTitle(entry) {
  // Prefer the caption when present — a real caption ("Look at my dog
  // 🐶") is always more informative than the page title would be.
  if (entry.caption) {
    const oneLine = entry.caption.replace(/\s+/g, ' ').trim();
    return oneLine.length > 90 ? oneLine.slice(0, 87) + '…' : oneLine;
  }
  // Then use the page title, but only if it carries real content —
  // Instagram, Facebook, and other login-walled platforms serve
  // og:title="<SiteName>" to anonymous crawlers, which is useless.
  if (entry.pageTitle && !isBotShellTitle(entry.pageTitle, entry)) return entry.pageTitle;
  return entry.sourceUrl || '(archived item)';
}

function renderViewerPost(entry) {
  const post = document.getElementById('viewer-post');
  const siteEl = document.getElementById('viewer-site');
  const authorEl = document.getElementById('viewer-author');
  const archivedEl = document.getElementById('viewer-archived');
  const pageTitleEl = document.getElementById('viewer-pagetitle');
  const captionEl = document.getElementById('viewer-caption');

  const platform = entry.platform || detectPlatform(entry.sourceUrl) || 'default';
  const site = entry.siteName || platformLabel(platform);
  const author = entry.author || entry.handle || '';
  const archivedAt = formatArchivedAt(entry.archivedAt);
  // Drop the bold page-title row when it's just a bot-shell echo of the
  // platform name (Instagram/Facebook anonymous scrape signature).
  const pageTitle = isBotShellTitle(entry.pageTitle, entry) ? '' : entry.pageTitle;
  const caption = entry.caption || '';

  // Hide the whole header strip when there's nothing meaningful to show —
  // keeps the viewer feeling clean for items where scraping didn't pick up
  // anything (rate-limited, FB-blocked, etc.).
  const hasAny = !!(site || author || archivedAt || pageTitle || caption);
  post.classList.toggle('hidden', !hasAny);
  post.dataset.platform = platform;

  siteEl.textContent = site || '';
  authorEl.textContent = author || '';
  archivedEl.textContent = archivedAt || '';
  archivedEl.title = archivedAtTooltip(entry.archivedAt);
  archivedEl.classList.toggle('hidden', !archivedAt);
  pageTitleEl.textContent = pageTitle || '';
  pageTitleEl.classList.toggle('hidden', !pageTitle);
  captionEl.textContent = caption || '';
  captionEl.classList.toggle('hidden', !caption);
}

function closeViewer() {
  if (!viewerState) return;
  if (history.state?.ambrosiaOverlay === 'viewer') {
    history.back();
    return;
  }
  closeViewerDOM();
}

function closeViewerDOM() {
  if (!viewerState) return;
  // Move focus out before flipping aria-hidden — otherwise the browser
  // warns about focus trapped inside an aria-hidden ancestor.
  if (viewer.contains(document.activeElement)) {
    try { document.activeElement.blur(); } catch (_) {}
  }
  // Revoke any blob URLs we created so the page can free their memory.
  for (const url of viewerState.blobUrls.values()) {
    try { URL.revokeObjectURL(url); } catch (_) {}
  }
  // Free the adjacent-archive prefetch cache too — when the viewer
  // closes, those preloaded blobs are no longer useful and we don't
  // want them held forever.
  for (const promise of adjacentMediaCache.values()) {
    promise.then((url) => { if (url) URL.revokeObjectURL(url); }).catch(() => {});
  }
  adjacentMediaCache.clear();
  viewerStage.innerHTML = '';
  viewerState = null;
  viewerRemove.disabled = false;
  viewerRemove.textContent = 'Remove';
  viewerShare.disabled = false;
  viewerShare.textContent = 'Share';
  viewer.classList.add('hidden');
  viewer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// Render the Instagram-style dot row at the bottom of the stage. Only
// shown for multi-item carousels small enough that dots stay readable —
// large collections rely on the counter pill alone since 30+ dots get
// visually noisy and unhelpful.
function renderViewerDots(total, currentIdx) {
  const show = total > 1 && total <= MAX_DOTS;
  viewerDots.classList.toggle('hidden', !show);
  if (!show) {
    viewerDots.innerHTML = '';
    return;
  }
  // Reuse existing dots when the count matches to avoid layout flicker
  // on every navigation; only swap the .active class.
  if (viewerDots.childElementCount !== total) {
    viewerDots.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('span');
      dot.className = 'viewer-dot';
      // Click a dot to jump straight to that slide. Stop propagation
      // so the click doesn't bubble up to the bottom feed-nav zone
      // and trigger an unwanted feed-navigate as a side effect.
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!viewerState) return;
        viewerState.idx = i;
        renderViewerStage();
      });
      viewerDots.appendChild(dot);
    }
  }
  for (let i = 0; i < total; i++) {
    viewerDots.children[i].classList.toggle('active', i === currentIdx);
  }
}

async function renderViewerStage() {
  if (!viewerState) return;
  const { files, idx, entry } = viewerState;

  // Webpage archives reconstruct a captured site inside the stage as
  // a sandboxed iframe — no media slides, no carousel UI.
  if (entry?.type === 'webpage' && entry.hasSiteSnapshot && entry.siteManifestSiaUrl) {
    await renderViewerWebpage(entry);
    return;
  }

  // No media in this archive (text-only thread). Hide the stage
  // entirely — the viewer-thread section below renders the Reddit
  // post card as the primary content. Showing an empty placeholder
  // here would just steal vertical space that the card needs.
  viewerStage.classList.remove('viewer-stage-webpage');
  if (files.length === 0) {
    clearStageMedia();
    viewerCounter.classList.add('hidden');
    viewerPrev.classList.add('hidden');
    viewerNext.classList.add('hidden');
    viewerStage.classList.add('viewer-stage-hidden');
    return;
  }
  viewerStage.classList.remove('viewer-stage-hidden');

  // Counter + arrow visibility. Arrows only appear for multi-file albums;
  // otherwise the hover-overlay is a distraction with nothing to do.
  const isCarousel = files.length > 1;
  viewerCounter.textContent = isCarousel ? `${idx + 1} / ${files.length}` : '';
  viewerCounter.classList.toggle('hidden', !isCarousel);
  viewerPrev.classList.toggle('hidden', !isCarousel);
  viewerNext.classList.toggle('hidden', !isCarousel);
  viewerPrev.disabled = idx <= 0;
  viewerNext.disabled = idx >= files.length - 1;
  renderViewerDots(files.length, idx);

  const file = files[idx];

  // Synthetic thread slide — render the Reddit post card inline rather
  // than fetching media. Pause any video that was playing on the prior
  // slide via clearStageMedia().
  if (file.role === 'thread-slide') {
    clearStageMedia();
    document.getElementById('viewer-loading-overlay')?.classList.add('hidden');
    const wrap = document.createElement('div');
    wrap.className = 'viewer-thread-slide';
    wrap.appendChild(buildThreadButton(entry));
    viewerStage.appendChild(wrap);
    return;
  }

  // If this is the first render (stage is empty), show a fetching message.
  // On subsequent navigation, leave the previous media in place and just
  // surface the small loading overlay so there's no grey-flash gap.
  const stageHasMedia = !!viewerStage.querySelector('.viewer-media');
  const loadingOverlay = document.getElementById('viewer-loading-overlay');
  if (!stageHasMedia) {
    clearStageMedia();
    const loading = document.createElement('div');
    loading.className = 'viewer-loading';
    loading.textContent = 'Fetching from Sia…';
    viewerStage.appendChild(loading);
  } else if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
  }

  try {
    const blobUrl = await loadFileBlobUrl(file);
    if (!viewerState || viewerState.idx !== idx) return; // navigated away
    const isVideo = (file.mimeType || '').startsWith('video/') || file.role === 'video' || file.role === 'media';

    // Build the new element, wait until it's actually ready to display,
    // then swap it in atomically. This prevents the grey-frame flicker
    // between slides — old media stays visible until the new one is
    // decoded.
    const newEl = isVideo ? buildVideoElement(blobUrl) : buildImageElement(blobUrl);
    const ready = await waitForMediaReady(newEl);
    if (!viewerState || viewerState.idx !== idx) return;

    if (!ready.ok) {
      // Video/image bytes downloaded but the browser can't decode them.
      // Surface the underlying cause instead of leaving the broken-play
      // icon as the only signal. Common causes: codec not supported on
      // this platform (HEVC on Android, AV1 on older Safari), MIME type
      // missing/wrong, or truncated/corrupt bytes from a flaky upstream.
      clearStageMedia();
      loadingOverlay?.classList.add('hidden');
      const errEl = document.createElement('div');
      errEl.className = 'viewer-error';
      const codecHint = ready.code === 4
        ? 'codec not supported on this device'
        : ready.code === 3 ? 'decode failed (corrupt or truncated bytes)'
        : ready.code === 2 ? 'network error fetching media'
        : 'media element error';
      errEl.textContent = `${isVideo ? 'Video' : 'Image'} couldn\'t play: ${codecHint} (mime: ${file.mimeType || 'unknown'})`;
      viewerStage.appendChild(errEl);
      console.warn('[ambrosia] media element error', {
        idx, role: file.role, mimeType: file.mimeType,
        siaUrl: file.siaUrl, errorCode: ready.code, errorMessage: ready.message,
      });
      return;
    }

    clearStageMedia();
    loadingOverlay?.classList.add('hidden');
    viewerStage.appendChild(newEl);

    // Warm the neighboring slides so prev/next is instant — no Sia
    // round-trip when the user clicks the arrow.
    prefetchNeighbor(idx + 1);
    prefetchNeighbor(idx - 1);
  } catch (err) {
    if (!viewerState || viewerState.idx !== idx) return;
    clearStageMedia();
    loadingOverlay?.classList.add('hidden');
    const errEl = document.createElement('div');
    errEl.className = 'viewer-error';
    errEl.textContent = 'Couldn\'t fetch from Sia: ' + (err.message || String(err));
    viewerStage.appendChild(errEl);
  }
}

function renderViewerWebpage(entry) {
  clearStageMedia();
  viewerCounter.classList.add('hidden');
  viewerPrev.classList.add('hidden');
  viewerNext.classList.add('hidden');
  viewerStage.classList.remove('viewer-stage-hidden');
  viewerStage.classList.add('viewer-stage-webpage');

  // Show a clickable preview card instead of auto-loading the
  // reconstructed iframe. Auto-load would either eat ~30s + many
  // Sia round-trips on every viewer open, or — if we routed to a
  // new tab automatically — leave the user with no path to reach
  // Share / Source / Remove. The explicit click also makes the
  // "this is a saved page" archive type feel deliberate.
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'viewer-media viewer-webpage-card';

  const thumb = document.createElement('div');
  thumb.className = 'viewer-webpage-card-thumb';
  if (entry.thumbnailSiaUrl || entry.thumbnailUrl) {
    const img = document.createElement('img');
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => { img.remove(); thumb.classList.add('viewer-webpage-card-thumb-empty'); };
    thumb.appendChild(img);
    loadThumbnailInto(entry, img);
  } else {
    thumb.classList.add('viewer-webpage-card-thumb-empty');
    thumb.textContent = '📄';
  }
  card.appendChild(thumb);

  const body = document.createElement('div');
  body.className = 'viewer-webpage-card-body';
  const host = document.createElement('div');
  host.className = 'viewer-webpage-card-host';
  host.textContent = entry.siteName || safeHostnameOf(entry.sourceUrl) || 'webpage';
  body.appendChild(host);
  const title = document.createElement('div');
  title.className = 'viewer-webpage-card-title';
  title.textContent = entry.title || entry.pageTitle || entry.sourceUrl || '(no title)';
  body.appendChild(title);
  const meta = document.createElement('div');
  meta.className = 'viewer-webpage-card-meta';
  const parts = [];
  if (entry.siteFileCount != null) parts.push(`${entry.siteFileCount} file${entry.siteFileCount === 1 ? '' : 's'}`);
  if (entry.siteBundleBytes != null) parts.push(formatBytes(entry.siteBundleBytes));
  if (entry.archivedAt) parts.push(`archived ${formatArchivedAt(entry.archivedAt)}`);
  meta.textContent = parts.join(' · ');
  body.appendChild(meta);
  const cta = document.createElement('div');
  cta.className = 'viewer-webpage-card-cta';
  cta.textContent = 'Click to open archived page in a new tab ↗';
  body.appendChild(cta);
  card.appendChild(body);

  card.addEventListener('click', () => openWebpageInNewTab(entry));
  viewerStage.appendChild(card);
}

function clearStageMedia() {
  // Remove only the media/loading/error nodes; keep the arrows + counter
  // + loading-overlay structural elements in place so we don't have to
  // re-attach event listeners.
  viewerStage
    .querySelectorAll('.viewer-media, .viewer-loading, .viewer-error, .viewer-stage-empty-msg, iframe.viewer-webpage, .viewer-thread-slide')
    .forEach((el) => el.remove());
}

function buildImageElement(blobUrl) {
  const img = document.createElement('img');
  img.src = blobUrl;
  img.alt = '';
  img.className = 'viewer-media';
  return img;
}

// Cross-archive audio preference. The first video on a page must
// autoplay muted (browser policy), but once the user has unmuted any
// video the page-level autoplay quota is satisfied — subsequent
// videos can autoplay unmuted. Without tracking this, every feed
// navigation re-mutes the next video and the user has to re-click
// the controls every time. Persisted to localStorage so the
// preference survives reloads.
const FEED_AUDIO_PREF_KEY = 'ambrosia.feedUnmuted';
let feedAudioUnmuted = (() => {
  try { return localStorage.getItem(FEED_AUDIO_PREF_KEY) === '1'; }
  catch { return false; }
})();

function buildVideoElement(blobUrl) {
  const v = document.createElement('video');
  v.src = blobUrl;
  v.className = 'viewer-media viewer-video';
  v.controls = true;
  // TikTok-style: autoplay muted on first entry (muted is required
  // for unattended autoplay), then inherit the user's preference for
  // subsequent feed navigations.
  v.autoplay = true;
  v.muted = !feedAudioUnmuted;
  v.loop = true;
  v.playsInline = true;
  v.preload = 'auto';
  // Track the user's mute toggle. When they unmute (or re-mute) via
  // the native controls, persist that as the feed-wide preference so
  // the next archive opens with the same audio state.
  v.addEventListener('volumechange', () => {
    const wasUnmuted = feedAudioUnmuted;
    feedAudioUnmuted = !v.muted;
    if (wasUnmuted !== feedAudioUnmuted) {
      try { localStorage.setItem(FEED_AUDIO_PREF_KEY, feedAudioUnmuted ? '1' : '0'); } catch {}
    }
  });
  return v;
}

function waitForMediaReady(el) {
  return new Promise((resolve) => {
    if (el.tagName === 'IMG') {
      if (el.complete && el.naturalWidth > 0) return resolve({ ok: true });
      el.addEventListener('load', () => resolve({ ok: true }), { once: true });
      el.addEventListener('error', () => resolve({ ok: false, code: 0, message: 'image decode failed' }), { once: true });
    } else {
      const onReady = () => {
        // Surface the video's intrinsic dimensions so we can tell when
        // an archived file's encoded aspect ratio doesn't match what the
        // source platform displays (e.g. Cobalt sometimes delivers a
        // 16:9 canvas with portrait content crop-zoomed inside, or
        // vice-versa). object-fit:contain in the stage CSS will only
        // letterbox correctly if the file's intrinsic aspect matches
        // what was originally captured.
        console.info('[ambrosia] video loaded', {
          intrinsic: `${el.videoWidth}x${el.videoHeight}`,
          aspect: el.videoHeight ? (el.videoWidth / el.videoHeight).toFixed(3) : 'n/a',
        });
        resolve({ ok: true });
      };
      if (el.readyState >= 2) return onReady();
      el.addEventListener('loadeddata', onReady, { once: true });
      el.addEventListener('error', () => {
        // HTMLMediaElement.error.code: 1=aborted, 2=network, 3=decode, 4=src_not_supported
        const me = el.error;
        resolve({ ok: false, code: me?.code || 0, message: me?.message || 'video element error' });
      }, { once: true });
    }
  });
}

function prefetchNeighbor(idx) {
  if (!viewerState) return;
  const { files } = viewerState;
  if (idx < 0 || idx >= files.length) return;
  const file = files[idx];
  if (!file.siaUrl) return;
  if (viewerState.blobUrls.has(file.siaUrl)) return;
  // Fire-and-forget; populates viewerState.blobUrls. Errors here are
  // silent — they'll surface when the user actually navigates.
  loadFileBlobUrl(file).catch(() => {});
}

// Adjacent-archive media cache. When the user opens an archive, we
// prefetch the primary file blob for ±1 archives in the feed so
// vertical navigation is instant. Survives feed navigation. Kept tight
// (just ±1) because each prefetch holds open a WebTransport session
// pool — too many in flight at once causes "not enough shards" /
// "object not found" failures, especially on iOS where WebTransport is
// stricter about idle sessions.
const adjacentMediaCache = new Map(); // Map<siaUrl, Promise<string>> (blob URL)
const ADJACENT_RADIUS = 1;
const PREFETCH_DELAY_MS = 250;
let prefetchTimer = null;
let prefetchGen = 0;

function pickPrimaryFile(entry) {
  if (!entry) return null;
  const files = entry.files && entry.files.length
    ? entry.files
    : [{ role: entry.type, siaUrl: entry.siaUrl, mimeType: entry.mimeType }];
  return files.find((f) => f?.siaUrl && f.role !== 'audio')
      || files.find((f) => f?.siaUrl)
      || null;
}

function prefetchAdjacentArchives() {
  if (!viewerState) return;
  // Defer the actual prefetch start so rapid feed navigation doesn't
  // queue up stale downloads. Each call cancels the prior pending
  // start and bumps the generation counter.
  if (prefetchTimer) clearTimeout(prefetchTimer);
  prefetchGen += 1;
  const myGen = prefetchGen;
  prefetchTimer = setTimeout(() => {
    if (myGen !== prefetchGen) return;
    if (!viewerState) return;
    runPrefetch();
  }, PREFETCH_DELAY_MS);
}

function runPrefetch() {
  const { archives, archiveIdx } = viewerState;
  const wanted = new Set();

  for (let off = -ADJACENT_RADIUS; off <= ADJACENT_RADIUS; off++) {
    if (off === 0) continue;
    const target = archives[archiveIdx + off];
    if (!target) continue;
    const file = pickPrimaryFile(target);
    if (!file?.siaUrl) continue;
    wanted.add(file.siaUrl);
    if (adjacentMediaCache.has(file.siaUrl)) continue;

    const promise = (async () => {
      try {
        const blob = await downloadSiaBlobWithRetry(file.siaUrl, file.mimeType || null);
        return URL.createObjectURL(blob);
      } catch (err) {
        console.warn('[ambrosia] adjacent prefetch failed:', err);
        return null;
      }
    })();
    adjacentMediaCache.set(file.siaUrl, promise);
  }

  // Evict entries outside the window — revoke the blob URLs so memory
  // gets freed even if the GC doesn't get to them.
  for (const [siaUrl, promise] of adjacentMediaCache) {
    if (wanted.has(siaUrl)) continue;
    promise.then((url) => { if (url) URL.revokeObjectURL(url); }).catch(() => {});
    adjacentMediaCache.delete(siaUrl);
  }
}

async function loadFileBlobUrl(file) {
  if (viewerState.blobUrls.has(file.siaUrl)) return viewerState.blobUrls.get(file.siaUrl);
  // Hot path: this file was prefetched as part of adjacent-archive
  // warming. Promote the cache entry into the current viewerState so
  // it's revoked properly on close, and remove from the adjacent
  // cache so we don't double-revoke.
  if (adjacentMediaCache.has(file.siaUrl)) {
    const url = await adjacentMediaCache.get(file.siaUrl);
    adjacentMediaCache.delete(file.siaUrl);
    if (url) {
      viewerState.blobUrls.set(file.siaUrl, url);
      return url;
    }
  }
  const blob = await downloadSiaBlobWithRetry(file.siaUrl, file.mimeType || null);
  const url = URL.createObjectURL(blob);
  viewerState.blobUrls.set(file.siaUrl, url);
  return url;
}

viewerPrev.addEventListener('click', () => {
  if (!viewerState || viewerState.idx <= 0) return;
  viewerState.idx -= 1;
  renderViewerStage();
});
viewerNext.addEventListener('click', () => {
  if (!viewerState || viewerState.idx >= viewerState.files.length - 1) return;
  viewerState.idx += 1;
  renderViewerStage();
});

// Swipe-to-navigate on the stage. Threshold + velocity-based — a casual
// drag of >= 60 px commits to a navigation; smaller deltas snap back.
//
// Two axes:
//   - Horizontal: navigates within a multi-item archive (carousel).
//   - Vertical: navigates between archives in the library feed
//     (Instagram-Reels-style up/down).
(function attachSwipe() {
  let startX = 0, startY = 0, startedAt = 0, locked = null, dx = 0, dy = 0;
  const SWIPE_THRESHOLD = 60;
  const VEL_THRESHOLD = 0.4; // px/ms

  // Capture phase so a <video controls> element inside the stage
  // doesn't swallow swipe gestures (the native controls handle taps
  // and drags on their own UI strip and would otherwise prevent our
  // vertical-swipe-to-feed-navigate from registering).
  viewerStage.addEventListener('touchstart', (e) => {
    if (!viewerState) return;
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startedAt = performance.now();
    locked = null;
    dx = 0;
    dy = 0;
  }, { passive: true, capture: true });

  viewerStage.addEventListener('touchmove', (e) => {
    if (!viewerState) return;
    const t = e.touches[0];
    const ax = Math.abs(t.clientX - startX);
    const ay = Math.abs(t.clientY - startY);
    if (locked === null) {
      if (ax < 6 && ay < 6) return;
      locked = ax > ay * 1.2 ? 'h' : 'v';
    }
    const media = viewerStage.querySelector('.viewer-media');
    if (locked === 'h') {
      if (viewerState.files.length <= 1) return;
      dx = t.clientX - startX;
      const atStart = viewerState.idx <= 0;
      const atEnd = viewerState.idx >= viewerState.files.length - 1;
      if ((atStart && dx > 0) || (atEnd && dx < 0)) dx *= 0.25;
      if (media) media.style.transform = `translateX(${dx}px)`;
    } else if (locked === 'v') {
      dy = t.clientY - startY;
      const { archives, archiveIdx } = viewerState;
      const atStart = archiveIdx <= 0;
      const atEnd = archiveIdx >= archives.length - 1;
      if ((atStart && dy > 0) || (atEnd && dy < 0)) dy *= 0.25;
      if (media) media.style.transform = `translateY(${dy}px)`;
    }
  }, { passive: true, capture: true });

  viewerStage.addEventListener('touchend', () => {
    if (!viewerState) return;
    const media = viewerStage.querySelector('.viewer-media');
    if (locked === 'h' && viewerState.files.length > 1) {
      const elapsed = Math.max(1, performance.now() - startedAt);
      const velocity = Math.abs(dx) / elapsed;
      const commit = Math.abs(dx) > SWIPE_THRESHOLD || velocity > VEL_THRESHOLD;
      if (media) media.style.transform = '';
      if (commit) {
        if (dx < 0 && viewerState.idx < viewerState.files.length - 1) {
          viewerState.idx += 1;
          renderViewerStage();
        } else if (dx > 0 && viewerState.idx > 0) {
          viewerState.idx -= 1;
          renderViewerStage();
        }
      }
    } else if (locked === 'v') {
      const elapsed = Math.max(1, performance.now() - startedAt);
      const velocity = Math.abs(dy) / elapsed;
      const commit = Math.abs(dy) > SWIPE_THRESHOLD || velocity > VEL_THRESHOLD;
      if (media) media.style.transform = '';
      if (commit) {
        feedNavigate(dy < 0 ? 1 : -1);
      }
    } else {
      if (media) media.style.transform = '';
    }
  }, { passive: true, capture: true });

  // Mouse-wheel feed navigation. Debounced so a single wheel flick
  // doesn't skip multiple archives. Use capture phase so the handler
  // fires BEFORE descendant elements get the wheel event — without
  // capture, a <video controls> element sitting in the stage swallows
  // vertical wheel deltas (Firefox uses them for volume scroll on the
  // native controls strip), and feed navigation breaks while a video
  // is playing.
  let wheelLockUntil = 0;
  viewer.addEventListener('wheel', (e) => {
    if (!viewerState || viewer.classList.contains('hidden')) return;
    if (Math.abs(e.deltaY) < 30) return;
    const now = performance.now();
    if (now < wheelLockUntil) return;
    wheelLockUntil = now + 600;
    feedNavigate(e.deltaY > 0 ? 1 : -1);
  }, { passive: true, capture: true });
})();

document.querySelectorAll('[data-viewer-close]').forEach((el) => {
  el.addEventListener('click', closeViewer);
});
document.addEventListener('keydown', (e) => {
  if (!viewerState) return;
  if (e.key === 'Escape') closeViewer();
  if (e.key === 'ArrowLeft') viewerPrev.click();
  if (e.key === 'ArrowRight') viewerNext.click();
  if (e.key === 'ArrowUp') { e.preventDefault(); feedNavigate(-1); }
  if (e.key === 'ArrowDown') { e.preventDefault(); feedNavigate(1); }
});

viewerShare.addEventListener('click', () => {
  if (!viewerState) return;
  const sias = viewerState.files.map((f) => f.siaUrl).filter(Boolean);
  if (!sias.length) return;
  navigator.clipboard.writeText(sias.join('\n'));
  viewerShare.textContent = 'Copied';
  setTimeout(() => { viewerShare.textContent = 'Share'; }, 1200);
});

// Purge an archive: unpin every Sia object it points to, drop cached
// thumbnails, then delete the local record. Returns true if everything
// completed (best-effort — individual unpin failures are logged but
// don't abort). Used by the viewer's Remove button and the library
// tile's hover × so both code paths leave no trace behind.
async function purgeArchive(entry) {
  const shareUrls = new Set();
  if (entry.siaUrl) shareUrls.add(entry.siaUrl);
  if (entry.audioSiaUrl) shareUrls.add(entry.audioSiaUrl);
  if (entry.thumbnailSiaUrl) shareUrls.add(entry.thumbnailSiaUrl);
  if (entry.threadSiaUrl) shareUrls.add(entry.threadSiaUrl);
  if (entry.siteManifestSiaUrl) shareUrls.add(entry.siteManifestSiaUrl);
  for (const f of (entry.files || [])) if (f?.siaUrl) shareUrls.add(f.siaUrl);

  if (shareUrls.size > 0) {
    try {
      const sdk = await getSdk();
      await Promise.allSettled([...shareUrls].map(async (url) => {
        try {
          const obj = await sdk.sharedObject(url);
          await sdk.deleteObject(obj.id());
        } catch (err) {
          console.warn('[ambrosia] unpin failed for', url, err);
        }
      }));
    } catch (err) {
      console.warn('[ambrosia] sdk init failed during purge:', err);
    }
  }

  if (entry.thumbnailSiaUrl) {
    try { await deleteCachedThumb(entry.thumbnailSiaUrl); } catch (_) {}
    const memUrl = thumbBlobCache.get(entry.thumbnailSiaUrl);
    if (memUrl) {
      try { URL.revokeObjectURL(memUrl); } catch (_) {}
      thumbBlobCache.delete(entry.thumbnailSiaUrl);
    }
  }
  await removeArchive(entry.id);
  return true;
}

viewerRemove.addEventListener('click', async () => {
  if (!viewerState) return;
  const a = viewerState.entry;
  const ok = confirm(
    'Remove this archive?\n\n' +
    'This unpins the data from your Sia account, freeing up your pinned-storage quota. ' +
    'The data is gone — anyone with the share link will get a fetch error.',
  );
  if (!ok) return;

  viewerRemove.disabled = true;
  viewerRemove.textContent = 'Removing…';
  await purgeArchive(a);
  closeViewer();
  await renderLibrary();
});

// WebTransport support indicator. Sia's browser SDK uses WebTransport to
// talk to hosts — without it, uploads/downloads can't work at all. Show a
// quick green/red badge so users on incompatible browsers see immediately
// why nothing's happening.
(function renderWebTransportStatus() {
  const el = document.getElementById('webtransport-status');
  if (!el) return;
  const supported = typeof WebTransport === 'function';
  el.textContent = supported
    ? '🟢 WebTransport available — Sia hosts reachable from this browser'
    : '🔴 WebTransport unavailable — your browser can\'t talk to Sia hosts. Try Chrome, Edge, or Firefox 132+.';
  el.title = supported
    ? 'window.WebTransport is defined; uploads and downloads should work.'
    : 'window.WebTransport is not defined; uploads and downloads will fail.';
})();

// Extension presence indicator. The Ambrosia browser extension unlocks
// gallery-dl-via-Pyodide for ~300 sites Cobalt doesn't cover and routes
// fetches through the user's residential IP/cookies. Without it the
// pipeline still works — just narrower (Cobalt-supported video sites
// only). Re-render on the first presence ping since the content-bridge
// can inject after this script runs.
function renderExtensionStatus() {
  const el = document.getElementById('extension-status');
  if (!el) return;
  if (isExtensionInstalled()) {
    const ver = extensionVersionStr();
    el.textContent = ver
      ? `🟢 Ambrosia extension v${ver} detected`
      : '🟢 Ambrosia extension detected';
    el.title = 'gallery-dl + residential-IP fetch + login-walled site scraping are available.';
  } else {
    el.textContent = '🟡 Ambrosia extension not detected — limited extractor coverage';
    el.title = 'Without the extension only Cobalt-supported sites work. Install the extension for gallery-dl and login-walled sites.';
  }
}
renderExtensionStatus();
// The extension's content-bridge sometimes injects after this script
// runs; waitForExtension resolves on first presence ping (or 4s timeout).
// Re-render once that happens so the indicator flips green without a
// page reload. Also kick off the enrichment runner — capabilities
// just unlocked.
waitForExtension(4000).then(() => {
  renderExtensionStatus();
  // If the supported-sites modal is currently open, re-render so the
  // gallery-dl portion appears now that the extension is detected.
  if (!supportedSitesModal.classList.contains('hidden')) {
    renderSupportedSitesSearch();
  }
  if (isExtensionInstalled()) enrichIncompleteArchives();
});

// Enrichment runner — fills in archive data we couldn't capture at
// archive time because the user's browser lacked the right capability.
// Currently handles: Reddit thread JSON for archives created on a
// browser without the Ambrosia extension (Safari mobile, etc.) where
// reddit's `.json` endpoint CORS-blocked the page. When the same
// library opens on a browser WITH the extension, we fetch the missing
// thread data via the extension's residential-IP proxy, upload it to
// Sia as a new object, and update the archive record so future opens
// see the full thread.
let enrichmentInFlight = false;
async function enrichIncompleteArchives() {
  if (enrichmentInFlight) return;
  enrichmentInFlight = true;
  try {
    const archives = await listArchives();
    const incomplete = archives.filter((a) =>
      a.needsEnrichment?.thread && isRedditUrl(a.sourceUrl) && !a.hasThread,
    );
    if (incomplete.length === 0) return;
    console.info(`[ambrosia] enriching ${incomplete.length} incomplete archive(s)…`);

    let enriched = 0;
    for (const archive of incomplete) {
      try {
        const ok = await enrichArchiveWithThread(archive);
        if (ok) enriched += 1;
      } catch (err) {
        console.warn('[ambrosia] enrichment failed for', archive.sourceUrl, err);
        // Don't bail the whole loop on a single failure — other
        // archives might enrich fine.
      }
    }
    if (enriched > 0) {
      console.info(`[ambrosia] enriched ${enriched} archive(s) with thread data`);
      await renderLibrary();
    }
  } finally {
    enrichmentInFlight = false;
  }
}

async function enrichArchiveWithThread(archive) {
  // Pull thread JSON via the extension's residential-IP fetch path.
  // Returns null if reddit gates us / post is gone — that's a
  // permanent-for-now state, just leave the flag set and try again
  // next session.
  const thread = await fetchRedditThread(archive.sourceUrl);
  if (!thread) return false;

  const sdk = await getSdk();
  if (!sdk) return false;

  const json = JSON.stringify(thread);
  const blob = new Blob([json], { type: 'application/json' });

  const packed = sdk.uploadPacked({ maxInflight: 4 });
  let threadObj;
  try {
    await packed.add(blob.stream());
    const objects = await packed.finalize();
    if (objects.length !== 1) {
      throw new Error(`enrichment upload returned ${objects.length} objects, expected 1`);
    }
    threadObj = objects[0];
  } catch (err) {
    try { packed.cancel(); } catch (_) {}
    throw err;
  }

  threadObj.updateMetadata(buildObjectMetadata({
    filename: 'thread.json',
    contentType: 'application/json',
    sourceUrl: archive.sourceUrl,
    role: 'thread',
    sizeBytes: blob.size,
    platform: 'reddit',
    pageMeta: {
      pageTitle: thread.post?.title || archive.pageTitle || null,
      caption: thread.post?.selftext || archive.caption || null,
      author: thread.post?.author ? `u/${thread.post.author}` : archive.author || null,
      siteName: thread.post?.subreddit || archive.siteName || null,
    },
    archivedAt: archive.archivedAt,
    refs: archive.thumbnailObjectId ? { thumbnail: archive.thumbnailObjectId } : null,
    ext: {
      threadScore: thread.post?.score ?? null,
      threadCommentCount: thread.post?.num_comments ?? null,
      threadCreatedUtc: thread.post?.created_utc ?? null,
    },
  }));
  await sdk.pinObject(threadObj);
  const validUntil = new Date(Date.now() + SHARE_VALIDITY_MS);
  const threadSiaUrl = sdk.shareObject(threadObj, validUntil);

  // Upgrade the localStorage record. Future viewer opens will see
  // hasThread=true and fetch this thread JSON via the existing
  // renderViewerThread path.
  const archives = await listArchives();
  const idx = archives.findIndex((a) => a.id === archive.id);
  if (idx === -1) return false;
  archives[idx] = {
    ...archives[idx],
    hasThread: true,
    threadSiaUrl,
    threadObjectId: threadObj.id(),
    threadScore: thread.post?.score ?? archives[idx].threadScore ?? null,
    threadCommentCount: thread.post?.num_comments ?? archives[idx].threadCommentCount ?? null,
    threadCreatedUtc: thread.post?.created_utc ?? archives[idx].threadCreatedUtc ?? null,
    // Upgrade siteName / author from the thread payload if the
    // existing values were generic ("Reddit") or missing.
    siteName: thread.post?.subreddit || archives[idx].siteName || null,
    author: archives[idx].author || (thread.post?.author ? `u/${thread.post.author}` : null),
    needsEnrichment: null,
  };
  await replaceArchives(archives);
  return true;
}

// Browser-back-button-aware overlay handling. Each open of the viewer
// or add-modal pushes a sentinel history entry. The popstate listener
// closes the matching overlay when the user hits back, without ever
// actually navigating away from the gallery. When all overlays are
// closed, back navigates normally (e.g., out of the app).
function pushOverlayHistory(name) {
  // Tag the current state so popstate knows which overlay we're
  // standing on. Same URL — we're not changing routes, just stacking.
  history.pushState(
    { ambrosiaOverlay: name },
    '',
    window.location.pathname + window.location.search,
  );
}

window.addEventListener('popstate', () => {
  // Close whichever overlay is open. We don't touch history here —
  // popstate already moved us back; we just sync the UI to reality.
  // Stacked overlays close LIFO: thread reader sits on top of the
  // viewer, so check it first.
  const threadReader = document.getElementById('thread-reader');
  if (threadReader && !threadReader.classList.contains('hidden')) {
    closeThreadReaderDOM();
    return;
  }
  if (!viewer.classList.contains('hidden')) {
    closeViewerDOM();
    return;
  }
  if (!supportedSitesModal.classList.contains('hidden')) {
    closeSupportedSitesModalDOM();
    return;
  }
  if (!addModal.classList.contains('hidden')) {
    closeAddModalDOM();
    return;
  }
  if (!settingsMenu.classList.contains('hidden')) {
    settingsMenu.classList.add('hidden');
    settingsToggle.setAttribute('aria-expanded', 'false');
  }
});

// FAB → open the add-URL modal. Resets any prior progress/result UI so
// a fresh session starts clean.
fabAdd.addEventListener('click', () => openAddModal());

function openAddModal({ replaceHistory = false } = {}) {
  const wasHidden = addModal.classList.contains('hidden');
  addModal.classList.remove('hidden');
  addModal.setAttribute('aria-hidden', 'false');
  resultCard.classList.add('hidden');
  hideFailCard();
  clearBatch();
  clearProgress();
  document.body.style.overflow = 'hidden';
  if (wasHidden) {
    if (replaceHistory) {
      history.replaceState(
        { ambrosiaOverlay: 'add-modal' },
        '',
        window.location.pathname + window.location.search,
      );
    } else {
      pushOverlayHistory('add-modal');
    }
  }
  // Focus the URL input after the modal animates in (next frame).
  requestAnimationFrame(() => {
    try { urlInput.focus(); urlInput.select(); } catch (_) {}
  });
}

function closeAddModal() {
  // User-initiated close (X button, ESC, backdrop click). If we own a
  // history entry for this modal, navigate back so the URL bar's back
  // button stays in sync. popstate's listener below handles the actual
  // DOM teardown so this path is idempotent vs the back-button path.
  if (history.state?.ambrosiaOverlay === 'add-modal') {
    history.back();
    return;
  }
  closeAddModalDOM();
}

function closeAddModalDOM() {
  if (addModal.classList.contains('hidden')) return;
  if (addModal.contains(document.activeElement)) {
    try { document.activeElement.blur(); } catch (_) {}
  }
  addModal.classList.add('hidden');
  addModal.setAttribute('aria-hidden', 'true');
  // Only release scroll-lock if no other overlay (e.g. viewer) is up.
  if (viewer.classList.contains('hidden') && supportedSitesModal.classList.contains('hidden')) {
    document.body.style.overflow = '';
  }
}

addModal.querySelectorAll('[data-modal-close]').forEach((el) => {
  el.addEventListener('click', closeAddModal);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!supportedSitesModal.classList.contains('hidden') && viewer.classList.contains('hidden')) {
    closeSupportedSitesModal();
    return;
  }
  if (!addModal.classList.contains('hidden') && viewer.classList.contains('hidden')) {
    closeAddModal();
  }
});

supportedSitesOpen.addEventListener('click', () => {
  settingsMenu.classList.add('hidden');
  settingsToggle.setAttribute('aria-expanded', 'false');
  openSupportedSitesModal();
});

document.getElementById('export-urls').addEventListener('click', async () => {
  settingsMenu.classList.add('hidden');
  settingsToggle.setAttribute('aria-expanded', 'false');
  const archives = await listArchives();
  const urls = archives.map((a) => a.sourceUrl).filter(Boolean);
  if (urls.length === 0) {
    alert('No archives in the library yet.');
    return;
  }
  const text = urls.join('\n');
  // Render an in-page modal with a textarea + copy button instead of
  // a native alert — alerts can't show 100s of URLs cleanly and don't
  // let the user copy with a click. Built ad-hoc here since we don't
  // have a generic modal primitive yet.
  showUrlsModal(text, urls.length);
});

function showUrlsModal(text, count) {
  const overlay = document.createElement('div');
  overlay.className = 'urls-modal-overlay';
  overlay.innerHTML = `
    <div class="urls-modal-frame">
      <div class="urls-modal-header">
        <span>${count} source URL${count === 1 ? '' : 's'} (one per line)</span>
        <button type="button" class="iconbtn urls-modal-close">✕</button>
      </div>
      <textarea class="urls-modal-text" readonly></textarea>
      <div class="urls-modal-footer">
        <button type="button" class="iconbtn urls-modal-copy">Copy all</button>
      </div>
    </div>
  `;
  const ta = overlay.querySelector('.urls-modal-text');
  ta.value = text;
  ta.addEventListener('focus', () => ta.select());
  const close = () => overlay.remove();
  overlay.querySelector('.urls-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.urls-modal-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      const btn = overlay.querySelector('.urls-modal-copy');
      btn.textContent = 'Copied ✓';
      setTimeout(() => { btn.textContent = 'Copy all'; }, 1500);
    } catch (err) {
      ta.select();
      document.execCommand('copy');
    }
  });
  document.body.appendChild(overlay);
}

function openSupportedSitesModal({ replaceHistory = false } = {}) {
  const wasHidden = supportedSitesModal.classList.contains('hidden');
  supportedSitesModal.classList.remove('hidden');
  supportedSitesModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  renderSupportedSitesSearch();
  if (wasHidden) {
    if (replaceHistory) {
      history.replaceState(
        { ambrosiaOverlay: 'supported-sites' },
        '',
        window.location.pathname + window.location.search,
      );
    } else {
      pushOverlayHistory('supported-sites');
    }
  }
  requestAnimationFrame(() => {
    try { supportedSitesSearch.focus(); supportedSitesSearch.select(); } catch (_) {}
  });
}

function closeSupportedSitesModal() {
  if (history.state?.ambrosiaOverlay === 'supported-sites') {
    history.back();
    return;
  }
  closeSupportedSitesModalDOM();
}

function closeSupportedSitesModalDOM() {
  if (supportedSitesModal.classList.contains('hidden')) return;
  if (supportedSitesModal.contains(document.activeElement)) {
    try { document.activeElement.blur(); } catch (_) {}
  }
  supportedSitesModal.classList.add('hidden');
  supportedSitesModal.setAttribute('aria-hidden', 'true');
  if (viewer.classList.contains('hidden') && addModal.classList.contains('hidden')) {
    document.body.style.overflow = '';
  }
}

supportedSitesModal.querySelectorAll('[data-supported-sites-close]').forEach((el) => {
  el.addEventListener('click', closeSupportedSitesModal);
});

supportedSitesSearch.addEventListener('input', renderSupportedSitesSearch);
supportedSitesResults.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-example-url]');
  if (!btn) return;
  const exampleUrl = btn.getAttribute('data-example-url');
  if (!exampleUrl) return;
  closeSupportedSitesModalDOM();
  openAddModal({ replaceHistory: true });
  urlInput.value = exampleUrl;
  requestAnimationFrame(() => {
    try { urlInput.focus(); urlInput.select(); } catch (_) {}
  });
});

function safeSupportedSites() {
  // Cobalt sites are always available (server-side extraction, no
  // extension required). gallery-dl sites only work in browsers with
  // the Ambrosia extension installed — hide them otherwise so we
  // don't advertise capabilities we can't deliver in this session.
  const cobalt = COBALT_SUPPORTED_SITES.map((site) => ({ ...site, extractor: 'cobalt' }));
  const galleryDl = isExtensionInstalled()
    ? GALLERY_DL_SUPPORTED_SITES.map((site) => ({ ...site, extractor: 'gallery-dl' }))
    : [];
  return [...cobalt, ...galleryDl];
}

function renderSupportedSitesSearch() {
  const query = normalizeSearch(supportedSitesSearch.value);
  const safe = safeSupportedSites();
  const matches = safe
    .filter((site) => !query || supportedSiteMatches(site, query))
    .sort((a, b) => displayGalleryDlSiteName(a).localeCompare(displayGalleryDlSiteName(b)));

  supportedSitesResults.replaceChildren();
  const cobaltCount = safe.filter((s) => s.extractor === 'cobalt').length;
  const galleryDlCount = safe.filter((s) => s.extractor === 'gallery-dl').length;
  if (query) {
    supportedSitesCount.textContent = `${matches.length} shown for "${supportedSitesSearch.value.trim()}"`;
  } else if (galleryDlCount > 0) {
    supportedSitesCount.textContent = `${cobaltCount} via Cobalt + ${galleryDlCount} via gallery-dl`;
  } else {
    supportedSitesCount.textContent = `${cobaltCount} via Cobalt · install the Ambrosia extension to unlock gallery-dl coverage`;
  }

  // Render every match. ~360 cards × ~7 DOM nodes each = ~2.5k nodes,
  // which is fine for modern browsers. The previous .slice(0, 60) cap
  // was a stale perf hedge from when the list was being built ad-hoc;
  // it silently hid every site whose name sorted past "C…".
  const fragment = document.createDocumentFragment();
  for (const site of matches) fragment.appendChild(renderSupportedSiteResult(site));
  supportedSitesResults.appendChild(fragment);
}

function renderSupportedSiteResult(site) {
  const card = document.createElement('article');
  card.className = 'supported-site-card';

  const titleRow = document.createElement('div');
  titleRow.className = 'supported-site-title-row';
  const title = document.createElement('div');
  title.className = 'supported-site-title';
  title.textContent = displayGalleryDlSiteName(site);
  titleRow.appendChild(title);
  if (site.extractor) {
    const badge = document.createElement('span');
    badge.className = `supported-site-extractor extractor-${site.extractor}`;
    badge.textContent = site.extractor === 'cobalt' ? 'Cobalt' : 'gallery-dl';
    badge.title = site.extractor === 'cobalt'
      ? 'Extracted server-side via Cobalt — works in any browser.'
      : 'Extracted via gallery-dl in the Ambrosia extension — install the extension to enable.';
    titleRow.appendChild(badge);
  }
  card.appendChild(titleRow);

  const meta = document.createElement('div');
  meta.className = 'supported-site-meta';
  meta.textContent = `${site.host}${site.auth ? ` · ${site.auth}` : ''}`;
  card.appendChild(meta);

  const caps = document.createElement('div');
  caps.className = 'supported-site-caps';
  caps.textContent = site.capabilities || 'Listed by gallery-dl';
  card.appendChild(caps);

  const examples = document.createElement('div');
  examples.className = 'supported-site-examples';
  for (const example of pickSupportedExamples(site)) {
    const row = document.createElement('div');
    row.className = 'supported-site-example';
    const text = document.createElement('span');
    text.className = 'supported-site-example-url';
    text.textContent = `${example.label}: ${example.url}`;
    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'supported-site-use';
    use.textContent = 'Use';
    use.setAttribute('data-example-url', example.url);
    row.append(text, use);
    examples.appendChild(row);
  }
  card.appendChild(examples);

  return card;
}

function pickSupportedExamples(site) {
  const examples = Array.isArray(site.examples) ? site.examples : [];
  const preferred = examples.filter((example) => /individual|image|post|artwork|file|album|gallery/i.test(example.label));
  return (preferred.length ? preferred : examples).slice(0, 4);
}

function supportedSiteMatches(site, query) {
  return normalizeSearch([
    site.site,
    site.host,
    site.capabilities,
    site.auth,
    site.url,
    ...(site.examples || []).flatMap((example) => [example.label, example.url]),
  ].join(' ')).includes(query);
}

function displayGalleryDlSiteName(site) {
  return String(site?.site || '').replace(/^\[(.+)\]$/, '$1');
}

function normalizeSearch(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Settings menu (kebab in the top bar): toggle on click, close on
// outside-click. Holds the WebTransport status indicator and the reset
// button — neither needs prime-time space.
settingsToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = !settingsMenu.classList.contains('hidden');
  settingsMenu.classList.toggle('hidden', open);
  settingsToggle.setAttribute('aria-expanded', String(!open));
});
document.addEventListener('click', (e) => {
  if (!settingsMenu.classList.contains('hidden')
      && !settingsMenu.contains(e.target)
      && e.target !== settingsToggle) {
    settingsMenu.classList.add('hidden');
    settingsToggle.setAttribute('aria-expanded', 'false');
  }
});

document.getElementById('reset-app').addEventListener('click', async () => {
  const ok = confirm(
    'Reset Ambrosia?\n\n' +
    'This wipes everything Ambrosia stored in this browser:\n' +
    '  • Indexer / Cobalt URLs\n' +
    '  • Library of past archives\n' +
    '  • Cached thumbnails\n\n' +
    'Your archives are still on Sia and recoverable by signing back in with your recovery phrase. Continue?',
  );
  if (!ok) return;

  // Second prompt: also unpin every archived object from Sia? This is the
  // destructive option — once unpinned, the data is gone and the recovery
  // phrase won't bring it back. Default-deny via the cancel path.
  const archives = await listArchives();
  let unpin = false;
  if (archives.length > 0) {
    unpin = confirm(
      `Also unpin all ${archives.length} archived item${archives.length === 1 ? '' : 's'} from Sia?\n\n` +
      'This frees up your pinned-storage quota but PERMANENTLY DELETES the data. ' +
      'Even with your recovery phrase, the archives can\'t be restored after this.\n\n' +
      'OK = unpin everything (destructive). Cancel = keep data on Sia (recoverable).',
    );
  }

  if (unpin) {
    showIndeterminate(`Unpinning ${archives.length} archive${archives.length === 1 ? '' : 's'} from Sia…`);
    try {
      const sdk = await getSdk();
      // Collect every Sia object referenced across the whole library —
      // primary media, audio tracks, thumbnails, and packed-batch files.
      const shareUrls = new Set();
      for (const a of archives) {
        if (a.siaUrl) shareUrls.add(a.siaUrl);
        if (a.audioSiaUrl) shareUrls.add(a.audioSiaUrl);
        if (a.thumbnailSiaUrl) shareUrls.add(a.thumbnailSiaUrl);
        for (const f of (a.files || [])) if (f?.siaUrl) shareUrls.add(f.siaUrl);
      }
      let done = 0;
      const total = shareUrls.size;
      await Promise.allSettled([...shareUrls].map(async (url) => {
        try {
          const obj = await sdk.sharedObject(url);
          await sdk.deleteObject(obj.id());
        } catch (err) {
          console.warn('[ambrosia] reset unpin failed for', url, err);
        } finally {
          done += 1;
          showIndeterminate(`Unpinning ${done}/${total} from Sia…`);
        }
      }));
    } catch (err) {
      console.warn('[ambrosia] reset: sdk init failed during unpin:', err);
    }
  }

  clearAll();
  await clearThumbCache();
  location.href = './';
});

// Programmatic archive trigger — used by the extension deep-link
// (`?archive=<url>` query param) and by the extension's right-click /
// FAB-click messages. Opens the modal, prefills the URL, submits.
function triggerArchive(url) {
  if (!url) return;
  urlInput.value = url;
  let replaceHistory = false;
  if (!viewer.classList.contains('hidden')) {
    replaceHistory = history.state?.ambrosiaOverlay === 'viewer';
    closeViewerDOM();
  }
  if (!settingsMenu.classList.contains('hidden')) {
    settingsMenu.classList.add('hidden');
    settingsToggle.setAttribute('aria-expanded', 'false');
  }
  openAddModal({ replaceHistory });
  // Submit on the next tick so the modal is visible while the work
  // happens (progress UI lives inside the modal).
  setTimeout(() => form.requestSubmit(), 50);
}

// Listen for extension-driven archive requests (right-click menu, FAB).
onArchiveRequest((url) => triggerArchive(url));

// Deep-link via query string: `?archive=<URL>`. Read once at startup,
// then strip the param so a refresh doesn't re-trigger.
(function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const url = params.get('archive');
  if (!url) return;
  // Wait for bootstrap to finish (app key check, sdk init) before
  // submitting. Polling keeps this independent of bootstrap's promise.
  const interval = setInterval(() => {
    if (!fabAdd.classList.contains('hidden')) {
      clearInterval(interval);
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('archive');
      const newSearch = newParams.toString();
      window.history.replaceState({}, '', window.location.pathname + (newSearch ? '?' + newSearch : ''));
      triggerArchive(url);
    }
  }, 200);
  setTimeout(() => clearInterval(interval), 10000);
})();

// Per-URL extractor option overrides set by the recovery UI (e.g. the
// "Try webpage snapshot" button on the failure card). Consumed and
// cleared by the next form submit for that URL.
const pendingSubmitOpts = new Map();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  // Multi-URL bulk archive: split on newlines so the user can paste a
  // list and have each URL go through the full extract → upload flow
  // sequentially. Single URL flow behaves identically (one iteration,
  // auto-jumps to viewer on success).
  const rawInput = urlInput.value;
  const urls = rawInput.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (urls.length === 0) return;
  const isBatch = urls.length > 1;

  archiveBtn.disabled = true;
  archiveBtn.textContent = isBatch ? `Archiving 1/${urls.length}…` : 'Archiving…';
  resultCard.classList.add('hidden');
  hideFailCard();
  clearBatch();

  let lastRecord = null;
  let succeeded = 0;
  const failures = [];

  for (let urlIdx = 0; urlIdx < urls.length; urlIdx++) {
    const sourceUrl = urls[urlIdx];
    if (isBatch) {
      archiveBtn.textContent = `Archiving ${urlIdx + 1}/${urls.length}…`;
    }

  try {
    showIndeterminate(isBatch
      ? `Extracting ${urlIdx + 1}/${urls.length}: ${sourceUrl}`
      : 'Extracting media…');
    // Always request the best quality the source serves at "max". The
    // actual extractor (gallery-dl in the extension, Cobalt server,
    // direct media fetch, etc.) is chosen inside extractMedia by URL —
    // the user-facing label stays generic instead of leaking
    // implementation details.
    const overrideOpts = pendingSubmitOpts.get(sourceUrl) || {};
    pendingSubmitOpts.delete(sourceUrl);
    const { items, thread, pageSnapshot, source } = await extractMedia(sourceUrl, { videoQuality: 'max', ...overrideOpts });
    if (!items.length && !thread && !pageSnapshot) {
      throw new Error('No content extracted from this URL');
    }
    console.info('[ambrosia] extracted via', source, '— items:', items.length, 'thread:', !!thread, 'pageSnapshot:', !!pageSnapshot);
    const pageMetaPromise = pageMetaForArchive(sourceUrl, items);

    // Render every tile immediately so the user can see the post they're
    // archiving while Sia warms up. Each tile starts in `pending` state.
    // For thread-only / webpage-snapshot archives (no media items), the
    // batch tile area stays empty.
    renderBatch(items);
    const sourceLabel = describeExtractorSource(source) || 'extractor';
    if (pageSnapshot) {
      showIndeterminate(`Captured ${pageSnapshot.stats.assetsCaptured + 1} files via webpage snapshot (${formatBytes(pageSnapshot.stats.bundleBytes)}) — uploading…`);
    } else {
      showIndeterminate(`Extracted via ${sourceLabel} — preparing upload…`);
    }

    // Hydrate any tiles that didn't get a thumbnailUrl from Cobalt's
    // picker response (single TikTok / Twitter videos) — run
    // findThumbnailSource in parallel with the upload so the user sees
    // an actual preview within ~1s instead of staring at an emoji
    // fallback for the whole upload.
    const thumbHydration = (async () => {
      const meta = await pageMetaPromise;
      const url = await findThumbnailSource(items, sourceUrl, meta);
      if (!url) return;
      items.forEach((item, idx) => {
        if (!item.thumbnailUrl && !isExtensionStreamUrl(url)) hydrateBatchTileThumb(idx, url);
      });
      return url;
    })().catch((err) => {
      console.warn('[ambrosia] batch thumb hydration failed:', err);
      return null;
    });

    await wasmReady;
    if (!pageSnapshot) showIndeterminate(`Extracted via ${sourceLabel} — fetching page metadata…`);
    // Best-effort scrape of the source page for og: title / caption /
    // thumbnail. Some pages (Wikimedia front page, anything large or
    // CORS-walled) take many seconds to fetch — and the archive can
    // proceed without scraped meta, so don't let it block the upload
    // forever. After 8s, give up and continue with empty meta.
    const pageMeta = await Promise.race([
      pageMetaPromise,
      new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ]).then((m) => m || emptyPageMeta());
    if (!pageSnapshot) showIndeterminate(`Extracted via ${sourceLabel} — picking thumbnail…`);
    // For webpage-snapshot archives, use the captured og:image as the
    // thumbnail. items=[] so findThumbnailSource has nothing to chew
    // on; without this the snapshot would have no library thumbnail.
    const externalThumb = pageSnapshot?.thumbnailSourceUrl
      || (await Promise.race([
        thumbHydration,
        new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
      ]));
    const archivedAt = new Date().toISOString();
    if (!pageSnapshot) showIndeterminate(`Extracted via ${sourceLabel} — connecting to Sia…`);

    // Single packed upload for the entire archive — thumbnail + every
    // media item ride in one shared-slab batch. This is critical for
    // host efficiency: each Sia slab is ~4 MB, and an unpacked thumbnail
    // costs a full slab for what's typically a 50 KB image. Packing
    // saves at least one slab per archive, more for multi-item posts.
    // Stall heartbeat — Sia uploads frequently pause for many seconds
    // between shards while the SDK waits on hosts. Without a
    // continuously-updating "waiting X seconds" indicator the UI looks
    // hung. We track the last progress moment and tick a timer that
    // augments the detail line until the next onProgress arrives.
    let lastProgressAt = performance.now();
    let lastDetail = '';
    let lastTitle = '';
    let lastPercent = 0;
    const stallTimer = setInterval(() => {
      const elapsed = (performance.now() - lastProgressAt) / 1000;
      if (elapsed < 5 || !lastDetail) return;
      // Sia uploads routinely pause 30-90s between shards while the
      // SDK negotiates with hosts (connection limits, slow responses,
      // host rotation). Surface this as expected behaviour rather
      // than a frozen UI: keep the progress numbers visible, append
      // a "Sia is slow" suffix that scales with how long we've waited.
      const waitMsg = elapsed < 30
        ? `paused ${Math.round(elapsed)}s — Sia hosts negotiating…`
        : elapsed < 90
          ? `paused ${Math.round(elapsed)}s — long pauses are normal at this scale`
          : `paused ${Math.round(elapsed)}s — still working, hosts are slow tonight`;
      showDeterminate(
        lastTitle,
        '',
        lastPercent,
        `${lastDetail} · ${waitMsg}`,
      );
    }, 500);
    const stopStallTimer = () => clearInterval(stallTimer);

    const { thumbnailRef, threadRef, siteManifestRef, files } = await uploadArchiveWithRetry(items, externalThumb, sourceUrl, pageMeta, archivedAt, {
      thread,
      pageSnapshot,
      onProgress: ({ percent, bytesShipped, shardCount, hostsUsed }) => {
        lastProgressAt = performance.now();
        for (let i = 0; i < items.length; i++) setTileState(i, 'uploading', percent);
        const parts = [];
        if (items.length) parts.push(`${items.length} ${items.length === 1 ? 'item' : 'items'}`);
        if (thread) parts.push('thread');
        if (pageSnapshot) parts.push(`page snapshot (${pageSnapshot.files.length} files)`);
        if (externalThumb) parts.push('thumbnail');
        const via = describeExtractorSource(source);
        const title = via
          ? `Packing ${parts.join(' + ')} into Sia (via ${via})…`
          : `Packing ${parts.join(' + ')} into Sia…`;
        const detail = `${formatBytes(bytesShipped)} shipped · ${shardCount} shard${shardCount === 1 ? '' : 's'} · ${hostsUsed} host${hostsUsed === 1 ? '' : 's'}`;
        lastTitle = title;
        lastDetail = detail;
        lastPercent = percent;
        showDeterminate(title, '', percent, detail);
      },
      onRetry: (attempt, why) => {
        showIndeterminate(`Reconnecting to hosts (attempt ${attempt})…`);
        for (let i = 0; i < items.length; i++) setTileState(i, 'pending');
        console.warn('[ambrosia] retry:', why);
      },
      onStage: (stage, info) => {
        // Stage messages cover the gap between "Connecting to Sia…"
        // and the first shard upload (which switches to determinate
        // progress). Without these the user sees a static message
        // for ~10–60s while SDK init / thumbnail fetch / per-item
        // fetches happen serially.
        const parts = [];
        if (items.length) parts.push(`${items.length} ${items.length === 1 ? 'item' : 'items'}`);
        if (thread) parts.push('thread');
        if (pageSnapshot) parts.push(`page snapshot (${pageSnapshot.files.length} files)`);
        if (externalThumb) parts.push('thumbnail');
        const summary = parts.join(' + ');
        const detail = info?.total
          ? `${(info.index ?? 0) + 1}/${info.total}`
          : '';
        const stageLabel = ({
          'sdk-init': 'connecting Sia SDK',
          'fetching-thumbnail': 'fetching thumbnail bytes',
          'uploading-thumbnail': 'uploading thumbnail',
          'uploading-thread': 'uploading thread',
          'fetching-item': `fetching item ${detail}`,
          'uploading-item': `uploading item ${detail}`,
          'uploading-snapshot-file': `uploading snapshot file ${detail}`,
          'finalizing': 'finalizing slabs',
        })[stage] || stage;
        showIndeterminate(`Packing ${summary} into Sia (via ${sourceLabel}) — ${stageLabel}…`);
      },
    }).finally(stopStallTimer);
    for (let i = 0; i < items.length; i++) setTileState(i, 'done', 100);

    const primary = files.find((f) => f.role !== 'audio') || files[0];
    const thumbnailSiaUrl = thumbnailRef?.siaUrl || null;
    const thumbnailObjectId = thumbnailRef?.objectId || null;

    const platform = detectPlatform(sourceUrl);
    const titleFromCobalt = items.map((i) => i.filename).find(Boolean);
    const handle = pageMeta.author || extractHandle(platform, sourceUrl);

    // Type classification:
    // - webpage when the only payload is a captured site snapshot
    //   (last-resort fallback for sites no extractor handled)
    // - thread when there's no media but a Reddit thread payload exists
    // - photo / video / collection by media kind otherwise
    // - thread+media archives are still classified by their primary
    //   media kind; the thread is supplementary and shown in the viewer.
    let archiveType;
    if (!items.length && pageSnapshot && !thread) {
      archiveType = 'webpage';
    } else if (!items.length) {
      archiveType = 'thread';
    } else if (items[0].kind === 'photo') {
      archiveType = 'photo';
    } else if (items.length > 1) {
      archiveType = 'collection';
    } else {
      archiveType = 'video';
    }

    const threadSiaUrl = threadRef?.siaUrl || null;
    const threadObjectId = threadRef?.objectId || null;
    // Detect a "we wanted thread data but couldn't get it" state:
    // Reddit URL + media archived + no thread captured. Most common
    // cause is archiving from a browser without our extension (Safari
    // mobile, Chrome without extension) — direct fetch from page to
    // reddit's JSON API CORS-blocks. Mark this so a later visit from
    // an extension-equipped browser can fill in the gap automatically.
    const needsThreadEnrichment = isRedditUrl(sourceUrl) && !thread;
    // For text-only thread archives, prefer the thread's title (post
    // title) over a generic URL-derived title — the post title IS the
    // identifying content for those archives.
    const threadTitle = thread?.post?.title || null;
    // Surface the Reddit-flavored stats on the archive record so the
    // library card can render them without re-downloading the thread
    // JSON. Cheap to store (a few numbers) and lets the grid look
    // structurally familiar to a Reddit user — score, comment count,
    // posted-at timestamp.
    const threadScore = thread?.post?.score ?? null;
    const threadCommentCount = thread?.post?.num_comments ?? null;
    const threadCreatedUtc = thread?.post?.created_utc ?? null;

    const siteManifestSiaUrl = siteManifestRef?.siaUrl || null;
    const siteManifestObjectId = siteManifestRef?.objectId || null;
    const siteFileCount = siteManifestRef?.fileCount ?? null;
    const siteBundleBytes = siteManifestRef?.bundleBytes ?? null;
    // Webpage-only archives derive their title from the captured page's
    // <title>, not from any media filename.
    const snapshotTitle = pageSnapshot?.pageTitle || null;
    const snapshotHostname = pageSnapshot ? safeHostnameOf(pageSnapshot.sourceUrl) : null;

    const record = await addArchive({
      type: archiveType,
      platform,
      sourceUrl,
      title: pageMeta.pageTitle || threadTitle || snapshotTitle || cleanTitle(titleFromCobalt) || deriveTitle(sourceUrl),
      pageTitle: pageMeta.pageTitle || threadTitle || snapshotTitle || null,
      caption: pageMeta.caption || thread?.post?.selftext || null,
      author: pageMeta.author || (thread?.post?.author ? `u/${thread.post.author}` : null),
      // For thread-bearing archives prefer the captured subreddit (e.g.
       // "r/news") over the platform-generic siteName ("Reddit") that
       // pageMeta scraping tends to produce — the subreddit IS the site
       // identity for Reddit posts. Webpage snapshots use the hostname.
      siteName: thread?.post?.subreddit || pageMeta.siteName || snapshotHostname || null,
      handle,                                // @user / channel / etc., when we can derive it
      itemCount: items.length,
      hasThread: !!threadRef,                 // viewer uses this to decide whether to fetch thread JSON
      threadSiaUrl,
      threadObjectId,
      threadScore,
      threadCommentCount,
      threadCreatedUtc,
      needsEnrichment: needsThreadEnrichment ? { thread: 'unfetched' } : null,
      // Webpage-snapshot archives reference a sia-site manifest object
      // that maps virtual paths to per-file Sia share URLs. Viewer
      // fetches the manifest, then each file, and reconstructs the
      // page in a sandboxed iframe.
      hasSiteSnapshot: !!siteManifestRef,
      siteManifestSiaUrl,
      siteManifestObjectId,
      siteFileCount,
      siteBundleBytes,
      // Which extractor produced this archive — useful for the user to
      // see in the library card / viewer ("via gallery-dl", "via Cobalt"),
      // and for debugging which path handled which sites.
      extractorSource: source || null,
      thumbnailUrl: externalThumb,
      thumbnailSiaUrl,
      thumbnailObjectId,
      siaUrl: primary?.siaUrl || threadSiaUrl || siteManifestSiaUrl,
      mimeType: primary?.mimeType || (threadRef ? 'application/json' : null) || (siteManifestRef ? 'application/json' : null),
      sizeBytes: primary?.sizeBytes || threadRef?.sizeBytes || siteBundleBytes || null,
      files,
      archivedAt,
    });

    lastRecord = record;
    succeeded += 1;
  } catch (err) {
    console.error('[ambrosia] archive failed for', sourceUrl, err);
    failures.push({ url: sourceUrl, error: err?.message || String(err) });
    if (!isBatch) showFailWithRecovery(err, sourceUrl);
  }

  } // end for-each-url

  // After-loop summary. Single-URL path keeps the existing UX:
  // success → close modal and auto-open the new archive in viewer.
  // Batch path stays in the modal and reports per-URL outcomes.
  if (!isBatch && succeeded === 1 && lastRecord) {
    showDone(`Archived ${lastRecord.files?.length ?? 1} file${(lastRecord.files?.length ?? 1) === 1 ? '' : 's'} to Sia`);
    urlInput.value = '';
    await renderLibrary();
    clearBatch();
    closeAddModal();
    requestAnimationFrame(() => openViewer(lastRecord));
  } else if (isBatch) {
    if (succeeded > 0) urlInput.value = '';
    await renderLibrary();
    clearBatch();
    if (failures.length === 0) {
      showDone(`Archived all ${succeeded}/${urls.length} URLs to Sia`);
    } else if (succeeded === 0) {
      showFail(new Error(
        `All ${urls.length} URLs failed.\n` +
        failures.map((f) => `• ${f.url}\n  ${f.error}`).join('\n'),
      ));
    } else {
      showFail(new Error(
        `Archived ${succeeded}/${urls.length}. ${failures.length} failed:\n` +
        failures.map((f) => `• ${f.url}\n  ${f.error}`).join('\n'),
      ));
    }
  }

  archiveBtn.disabled = false;
  archiveBtn.textContent = 'Archive to Sia';
});

// Errors that mean "transient host- or indexer-side failure; redial and retry."
// Covers:
//   - WebTransport sessions to Sia hosts going idle after ~4s of inactivity
//   - Hosts that briefly refuse connections (CONNECTION_REFUSED, idle timeout)
//   - Indexer's `PinSlabs` returning empty when too few hosts responded in
//     time to form a complete slab
//   - Generic `Api(...)`/`app error` propagated from the SDK when one of the
//     above bubbles up at the wrong layer
// Invalidating the SDK forces `getSdk()` to rebuild and re-warm hosts on
// the next call, which usually resolves the issue.
const STALE_CONNECTION_RX = /not enough shards|failed to establish|idle[_ ]timeout|quic|error sending request|client error|pinslabs did not return|app error: api|connection refused|timeout|net::err/i;

function shouldRetrySiaDownload(err) {
  const msg = (err && (err.message || String(err))) || '';
  return STALE_CONNECTION_RX.test(msg)
      || /webtransport|timedout|timeout|connection rejected|reqwest|object not found/i.test(msg);
}

// Bumped from 3→5 attempts because rapid feed navigation on iOS hits
// transient host failures during connection-pool churn. Most retries
// succeed within 1-2 attempts; the higher cap covers the long tail.
async function downloadSiaBlobWithRetry(siaUrl, mimeType = null, attempts = 5) {
  let lastErr;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const sdk = await getSdk();
      const obj = await sdk.sharedObject(siaUrl);
      const stream = sdk.download(obj);
      return await new Response(stream, {
        headers: mimeType ? { 'content-type': mimeType } : {},
      }).blob();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === attempts - 1;
      if (isLast || !shouldRetrySiaDownload(err)) throw err;
      console.warn(`[ambrosia] retrying Sia download (attempt ${attempt + 1}/${attempts}):`, err.message || err);
      invalidateSdk();
      // Slightly faster backoff than upload retries — downloads are
      // user-facing and we don't want them to feel sluggish.
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function uploadArchiveWithRetry(items, thumbnailSourceUrl, sourceUrl, pageMeta, archivedAt, { onProgress, onRetry, thread = null, pageSnapshot = null, onStage = null } = {}, attempts = 4) {
  let lastErr;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      onStage?.('sdk-init');
      const sdk = await getSdk();
      return await uploadArchive(sdk, items, thumbnailSourceUrl, sourceUrl, pageMeta, archivedAt, onProgress, thread, pageSnapshot, onStage);
    } catch (err) {
      lastErr = err;
      const msg = (err && (err.message || String(err))) || '';
      const isLast = attempt === attempts - 1;
      if (isLast || !STALE_CONNECTION_RX.test(msg)) throw err;
      onRetry?.(attempt + 1, msg);
      invalidateSdk();
      // Linear backoff so transient host-side issues have time to settle
      // before we redial. Total worst-case wait across 4 attempts: 6s.
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}


// Best-effort: pick an external URL we can use as a thumbnail for the
// archive entry. Tried in order:
//   1. Cobalt-provided picker thumb (Instagram albums, Twitter threads, etc.)
//   2. oEmbed lookup against the source platform (TikTok, Vimeo, etc. —
//      single-video sources Cobalt doesn't provide thumbs for)
//   3. The first photo item's media URL (for single Instagram-photo posts
//      and similar — the photo IS the thumbnail)
async function findThumbnailSource(items, sourceUrl, pageMeta) {
  const picker = items.find((i) => i.thumbnailUrl);
  if (picker?.thumbnailUrl) return picker.thumbnailUrl;
  if (pageMeta?.thumbnailUrl) return pageMeta.thumbnailUrl;
  const oembedThumb = await fetchOEmbedThumbnail(sourceUrl);
  if (oembedThumb) return oembedThumb;
  const firstPhoto = items.find((i) => i.kind === 'photo');
  if (firstPhoto?.url) return firstPhoto.url;
  // Render a frame from the first video item ourselves. This handles
  // platforms Cobalt doesn't return a thumb for and that don't expose
  // oEmbed (Twitch clips, Reddit videos, Bluesky, etc.).
  const firstVideo = items.find((i) => i.kind === 'video' || i.kind === 'media');
  if (firstVideo?.url) {
    const blobUrl = await extractVideoFrameThumbnail(firstVideo.url);
    if (blobUrl) return blobUrl;
  }
  // Guarantee: every archive ends up with a thumbnail. If the entire
  // chain failed, draw a branded platform-themed placeholder ourselves.
  return generatePlaceholderThumbnail(sourceUrl, pageMeta);
}

// Render a 600×600 platform-themed placeholder to a blob URL. Used when
// every other thumbnail-source path failed — the library tile then still
// shows something coherent (platform badge + maybe author/title) instead
// of the bare emoji fallback.
function generatePlaceholderThumbnail(sourceUrl, pageMeta) {
  try {
    const platform = detectPlatform(sourceUrl);
    const palette = ({
      instagram: ['#831843', '#db2777'],
      tiktok:    ['#0f172a', '#f43f5e'],
      twitter:   ['#0c0c0c', '#3b82f6'],
      facebook:  ['#0f1f4f', '#3b82f6'],
      reddit:    ['#7c2d12', '#fb923c'],
      vimeo:     ['#0c4a6e', '#22d3ee'],
      twitch:    ['#3b0764', '#a855f7'],
      bluesky:   ['#0c4a6e', '#38bdf8'],
      default:   ['#0f172a', '#64748b'],
    })[platform] || ['#0f172a', '#64748b'];
    const label = platformLabel(platform);

    const SIZE = 600;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    grad.addColorStop(0, palette[0]);
    grad.addColorStop(1, palette[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, SIZE / 2, SIZE / 2 - 20);

    if (pageMeta?.author) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '500 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const author = pageMeta.author.length > 32 ? pageMeta.author.slice(0, 31) + '…' : pageMeta.author;
      ctx.fillText(author, SIZE / 2, SIZE / 2 + 36);
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return resolve(null);
        resolve(URL.createObjectURL(blob));
      }, 'image/jpeg', 0.85);
    });
  } catch (err) {
    console.warn('[ambrosia] placeholder generation failed:', err);
    return null;
  }
}

// oEmbed endpoints for platforms whose single-video pages don't surface a
// thumbnail through Cobalt's response. TikTok and Vimeo both publish
// CORS-enabled oEmbed endpoints that return `thumbnail_url`.
const OEMBED_ENDPOINTS = [
  { hostMatch: /(?:^|\.)tiktok\.com$/, endpoint: 'https://www.tiktok.com/oembed' },
  { hostMatch: /(?:^|\.)vimeo\.com$/,  endpoint: 'https://vimeo.com/api/oembed.json' },
];

// Decode the source video far enough to draw one frame to a canvas, then
// encode that frame as a JPEG blob and return a `blob:` URL. Returns null
// on any failure (CORS-tainted canvas, decode error, timeout). Caller is
// responsible for `URL.revokeObjectURL` once it's done with the result —
// in practice `archiveThumbnail` fetches and uploads it, after which it
// can be dropped.
function extractVideoFrameThumbnail(videoUrl) {
  return captureVideoFrameThumbnail(videoUrl).then(async (direct) => {
    if (direct) return direct;
    const fetched = await fetchVideoBlobUrlForThumbnail(videoUrl);
    if (!fetched) return null;
    try {
      return await captureVideoFrameThumbnail(fetched.blobUrl);
    } finally {
      try { URL.revokeObjectURL(fetched.blobUrl); } catch (_) {}
    }
  });
}

function captureVideoFrameThumbnail(videoUrl) {
  return new Promise((resolve) => {
    let settled = false;
    let frameTimer = null;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(frameTimer);
      try { video.removeAttribute('src'); video.load(); } catch (_) {}
      try { video.remove(); } catch (_) {}
      resolve(val);
    };
    const drawFrame = () => {
      try {
        const canvas = document.createElement('canvas');
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        if (!w || !h) return finish(null);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) return finish(null);
          finish(URL.createObjectURL(blob));
        }, 'image/jpeg', 0.82);
      } catch (err) {
        console.warn('[ambrosia] frame draw failed:', err);
        finish(null);
      }
    };
    const scheduleFrameCapture = () => {
      if (settled) return;
      clearTimeout(frameTimer);
      frameTimer = setTimeout(drawFrame, 450);
    };
    const timer = setTimeout(() => {
      console.warn('[ambrosia] video frame extraction timed out');
      finish(null);
    }, 12000);

    const video = document.createElement('video');
    video.muted = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.playsInline = true;
    video.style.display = 'none';
    document.body.appendChild(video);

    video.addEventListener('loadeddata', () => {
      const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 5;
      try {
        video.currentTime = Math.min(2, dur * 0.1);
        scheduleFrameCapture();
      } catch (_) {
        drawFrame();
      }
    }, { once: true });
    video.addEventListener('seeked', drawFrame, { once: true });
    video.addEventListener('canplay', scheduleFrameCapture, { once: true });
    video.addEventListener('error', () => {
      console.warn('[ambrosia] video element errored during frame extraction');
      finish(null);
    }, { once: true });

    video.src = videoUrl;
  });
}

async function fetchVideoBlobUrlForThumbnail(videoUrl) {
  if (!videoUrl) return null;
  try {
    const resp = isExtensionStreamUrl(videoUrl) ? fetchViaExtension(videoUrl) : await fetch(videoUrl);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return { blobUrl: URL.createObjectURL(blob) };
  } catch (err) {
    console.warn('[ambrosia] fallback video fetch for thumbnail failed:', err);
    return null;
  }
}

async function fetchOEmbedThumbnail(sourceUrl) {
  const u = safeUrl(sourceUrl);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const match = OEMBED_ENDPOINTS.find(({ hostMatch }) => hostMatch.test(host));
  if (!match) return null;
  try {
    const resp = await fetch(`${match.endpoint}?url=${encodeURIComponent(sourceUrl)}`, {
      headers: { 'accept': 'application/json' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.thumbnail_url || null;
  } catch (err) {
    console.warn('[ambrosia] oEmbed thumbnail lookup failed:', err);
    return null;
  }
}

// Upload a thumbnail to Sia and return its share URL. Best-effort: returns
// null on any failure, since a missing thumbnail is a cosmetic loss, not
// an archive failure.
// Upload a thumbnail to Sia. Returns `{ objectId, siaUrl }` so the caller
// can both display the thumbnail (via siaUrl) and embed `refs.thumbnail`
// in every related object's metadata (via objectId). Best-effort: returns
// null on any failure, since a missing thumbnail is a cosmetic loss, not
// an archive failure.
// Single packed upload for the entire archive — thumbnail + every media
// item in one shared-slab batch. Saves at least one slab per archive vs
// uploading the thumbnail separately (each Sia slab costs ~4 MB
// allocated, even for a 50 KB thumbnail), and shares slabs across all
// media items when there are several. Returns { thumbnailRef, files }.
async function uploadArchive(sdk, items, thumbnailSourceUrl, sourceUrl, pageMeta, archivedAt, onProgress, thread = null, pageSnapshot = null, onStage = null) {
  const validUntil = new Date(Date.now() + SHARE_VALIDITY_MS);

  // Fetch the thumbnail bytes upfront so we can pack them alongside the
  // media. Best-effort: missing thumbnail just means we don't pack one,
  // which is rare (the always-thumbnail fallback chain almost always
  // produces something).
  // Thumbnail fetch is best-effort. Some sources (giant Wikimedia
  // images, slow CDNs, extension stream stalls) take 30+ seconds.
  // Cap it at 10s — if no thumbnail, the library card just falls
  // back to a generated platform card. Better to ship a thumbnail-
  // less archive than to hang the whole upload.
  onStage?.('fetching-thumbnail');
  const thumb = await Promise.race([
    fetchThumbnailBytes(thumbnailSourceUrl),
    new Promise((resolve) => setTimeout(() => resolve(null), 10000)),
  ]);

  // Thread payload (post body + comments) gets serialized to JSON and
  // packed as an additional Sia object alongside thumbnail and media.
  // This way text-only Reddit posts have something to archive even
  // when items=[], and media-bearing threads also preserve the
  // surrounding discussion. The viewer fetches this lazily on open.
  let threadBlob = null;
  if (thread) {
    const json = JSON.stringify(thread);
    threadBlob = new Blob([json], { type: 'application/json' });
  }

  // Aggregate progress across thumbnail + items. onShardUploaded
  // callbacks don't identify which object a shard belongs to, so all
  // tiles advance together and use the asymptotic curve.
  let bytesShipped = 0;
  let shardCount = 0;
  const hostsSeen = new Set();
  let lastEmit = 0;
  const ASYMPTOTIC_SCALE = 60 * 1024 * 1024;

  // No maxInflight override — let the SDK pick. Custom values we
  // tried (8, then 32) both produced multi-minute slab-boundary
  // pauses, and 32 in particular oversubscribes Sia's 10-of-30
  // shard layout (SDK has 2 shards permanently waiting on a slab
  // that's already complete).
  const packed = sdk.uploadPacked({
    onShardUploaded: (p) => {
      shardCount += 1;
      bytesShipped += (p?.shardSize | 0);
      if (p?.hostKey) hostsSeen.add(p.hostKey);
      const now = performance.now();
      if (now - lastEmit < 100) return;
      lastEmit = now;
      const percent = Math.min(95, 95 * (1 - Math.exp(-bytesShipped / ASYMPTOTIC_SCALE)));
      onProgress?.({ percent, bytesShipped, shardCount, hostsUsed: hostsSeen.size });
    },
  });

  // Order in the packed upload: thumbnail, thread, media items, then
  // each page-snapshot file. The manifest itself is uploaded
  // separately AFTER we know each snapshot file's share URL — those
  // are only available post-finalize.
  const itemRefs = [];
  try {
    if (thumb) {
      onStage?.('uploading-thumbnail');
      const t0 = performance.now();
      console.info('[ambrosia] packed.add thumbnail start');
      await packed.add(thumb.blob.stream());
      console.info('[ambrosia] packed.add thumbnail done', Math.round(performance.now() - t0), 'ms');
    }
    if (threadBlob) {
      onStage?.('uploading-thread');
      const t0 = performance.now();
      console.info('[ambrosia] packed.add thread start');
      await packed.add(threadBlob.stream());
      console.info('[ambrosia] packed.add thread done', Math.round(performance.now() - t0), 'ms');
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      onStage?.('fetching-item', { index: i, total: items.length });
      const resp = await fetchItem(item);
      if (!resp.ok) throw new Error(`media fetch failed: HTTP ${resp.status}`);
      if (!resp.body) throw new Error('media fetch returned no body');
      // Skip the Response's content-type when it's the
      // application/octet-stream placeholder our extension bridge
      // bakes in before the upstream meta message arrives. The real
      // type lives in the URL extension or the gallery-dl item kind.
      const headerType = resp.headers.get('content-type');
      const contentType = (headerType && headerType !== 'application/octet-stream')
        ? headerType
        : guessMime(item, item.url);
      // Buffer the response into a Blob before handing it to the SDK.
      // The SDK's packed upload reader hits a deadlock on our custom
      // extension-bridge ReadableStream (verified via the standalone
      // test page: same SDK with Blob.stream() works fine, with the
      // raw extension stream it stalls after consuming all bytes).
      // Going through Blob.stream() rebuilds a spec-compliant byte
      // stream the SDK is happy to read — at the cost of holding the
      // full item in memory briefly. For typical archives (1-12 MB
      // per item) the memory hit is negligible.
      const blob = await resp.blob();
      const sizeBytes = blob.size;
      const filename = item.filename || deriveFilename(item, contentType, sourceUrl);
      onStage?.('uploading-item', { index: i, total: items.length });
      const t0 = performance.now();
      console.info('[ambrosia] packed.add item', i, 'start size=', sizeBytes);
      await packed.add(blob.stream());
      console.info('[ambrosia] packed.add item', i, 'done', Math.round(performance.now() - t0), 'ms');
      itemRefs.push({ item, contentType, sizeBytes, filename });
    }
    if (pageSnapshot) {
      for (let i = 0; i < pageSnapshot.files.length; i++) {
        onStage?.('uploading-snapshot-file', { index: i, total: pageSnapshot.files.length });
        await packed.add(pageSnapshot.files[i].blob.stream());
      }
    }
    onStage?.('finalizing');
    console.info('[ambrosia] packed.finalize start');
  } catch (err) {
    try { packed.cancel(); } catch (_) {}
    throw err;
  }

  const allObjects = await packed.finalize();
  console.info('[ambrosia] packed.finalize done — objects:', allObjects.length);
  const snapshotFileCount = pageSnapshot ? pageSnapshot.files.length : 0;
  const expectedCount = (thumb ? 1 : 0) + (threadBlob ? 1 : 0) + items.length + snapshotFileCount;
  if (allObjects.length !== expectedCount) {
    throw new Error(`packed upload returned ${allObjects.length} objects for ${expectedCount} expected`);
  }

  // Apply metadata + pin + share to each object in the order they were
  // added: thumbnail (if any), thread (if any), then media items.
  let pos = 0;
  let thumbnailRef = null;
  if (thumb) {
    const thumbObj = allObjects[pos++];
    thumbObj.updateMetadata(buildObjectMetadata({
      filename: 'thumbnail',
      contentType: thumb.contentType,
      sourceUrl,
      role: 'thumbnail',
      platform: detectPlatform(sourceUrl),
      pageMeta,
      archivedAt,
    }));
    await sdk.pinObject(thumbObj);
    thumbnailRef = {
      objectId: thumbObj.id(),
      siaUrl: sdk.shareObject(thumbObj, validUntil),
    };
    await rememberThumbBlob(thumbnailRef.siaUrl, thumb.blob);
  }

  let threadRef = null;
  if (threadBlob) {
    const threadObj = allObjects[pos++];
    threadObj.updateMetadata(buildObjectMetadata({
      filename: 'thread.json',
      contentType: 'application/json',
      sourceUrl,
      role: 'thread',
      sizeBytes: threadBlob.size,
      platform: detectPlatform(sourceUrl),
      pageMeta,
      archivedAt,
      refs: thumbnailRef?.objectId ? { thumbnail: thumbnailRef.objectId } : null,
      ext: thread?.post ? {
        threadScore: thread.post.score ?? null,
        threadCommentCount: thread.post.num_comments ?? null,
        threadCreatedUtc: thread.post.created_utc ?? null,
      } : null,
    }));
    await sdk.pinObject(threadObj);
    threadRef = {
      objectId: threadObj.id(),
      siaUrl: sdk.shareObject(threadObj, validUntil),
      sizeBytes: threadBlob.size,
    };
  }

  // Slice out the media object range BEFORE the page-snapshot files,
  // which were appended after media in the same packed upload.
  const mediaObjs = allObjects.slice(pos, pos + items.length);
  const files = [];
  for (let i = 0; i < mediaObjs.length; i++) {
    const obj = mediaObjs[i];
    const ref = itemRefs[i];
    const refsBag = {};
    if (thumbnailRef?.objectId) refsBag.thumbnail = thumbnailRef.objectId;
    if (threadRef?.objectId) refsBag.thread = threadRef.objectId;
    obj.updateMetadata(buildObjectMetadata({
      filename: ref.filename,
      contentType: ref.contentType,
      sourceUrl,
      role: ref.item.kind,
      sizeBytes: ref.sizeBytes,
      title: cleanTitle(ref.filename),
      platform: detectPlatform(sourceUrl),
      itemCount: items.length,
      role_index: i,
      pageMeta,
      archivedAt,
      refs: Object.keys(refsBag).length ? refsBag : null,
    }));
    await sdk.pinObject(obj);
    const siaUrl = sdk.shareObject(obj, validUntil);
    files.push({
      role: ref.item.kind,
      siaUrl,
      mimeType: ref.contentType,
      sizeBytes: ref.sizeBytes || null,
      filename: ref.filename,
    });
  }
  pos += items.length;

  // Page snapshot files come last in the packed upload. Each gets
  // metadata stamped with role='site-file' and its virtual path so
  // syncLibraryFromSia can identify them later. After we've shared
  // each one we have a path → siaUrl map; that map becomes the
  // sia-site manifest, uploaded as a separate packed object.
  let siteManifestRef = null;
  if (pageSnapshot && pageSnapshot.files.length) {
    const snapshotObjs = allObjects.slice(pos, pos + pageSnapshot.files.length);
    if (snapshotObjs.length !== pageSnapshot.files.length) {
      throw new Error(
        `page snapshot expected ${pageSnapshot.files.length} objects, got ${snapshotObjs.length}`,
      );
    }
    const filesMap = {};
    for (let i = 0; i < snapshotObjs.length; i++) {
      const obj = snapshotObjs[i];
      const file = pageSnapshot.files[i];
      obj.updateMetadata(buildObjectMetadata({
        filename: file.path,
        contentType: file.contentType,
        sourceUrl,
        role: 'site-file',
        sizeBytes: file.blob.size,
        title: file.path,
        platform: detectPlatform(sourceUrl),
        pageMeta,
        archivedAt,
        // Each site-file refers back to the manifest once it's uploaded
        // — we patch this in by linking from the manifest side via the
        // refs.snapshot pointer on the manifest itself.
      }));
      await sdk.pinObject(obj);
      filesMap[file.path] = sdk.shareObject(obj, validUntil);
    }

    // Second-phase upload: the manifest itself. Has to be a separate
    // packed call because it can't be built until we know each
    // file's share URL, which only exists post-finalize.
    const manifestBlob = buildSiteManifest(filesMap);
    const manifestPacked = sdk.uploadPacked({ maxInflight: 1 });
    let manifestObj;
    try {
      await manifestPacked.add(manifestBlob.stream());
      const [obj] = await manifestPacked.finalize();
      manifestObj = obj;
    } catch (err) {
      try { manifestPacked.cancel(); } catch (_) {}
      throw err;
    }
    manifestObj.updateMetadata(buildObjectMetadata({
      filename: 'manifest.json',
      contentType: 'application/json',
      sourceUrl,
      role: 'site-manifest',
      sizeBytes: manifestBlob.size,
      title: pageSnapshot.pageTitle || null,
      platform: detectPlatform(sourceUrl),
      pageMeta: {
        ...pageMeta,
        pageTitle: pageMeta?.pageTitle || pageSnapshot.pageTitle || null,
      },
      archivedAt,
      refs: thumbnailRef?.objectId ? { thumbnail: thumbnailRef.objectId } : null,
    }));
    await sdk.pinObject(manifestObj);
    siteManifestRef = {
      objectId: manifestObj.id(),
      siaUrl: sdk.shareObject(manifestObj, validUntil),
      fileCount: pageSnapshot.files.length,
      bundleBytes: pageSnapshot.stats?.bundleBytes ?? null,
    };
  }

  onProgress?.({ percent: 100, bytesShipped, shardCount, hostsUsed: hostsSeen.size });
  return { thumbnailRef, threadRef, siteManifestRef, files };
}

async function fetchThumbnailBytes(thumbnailSourceUrl) {
  if (!thumbnailSourceUrl) return null;
  if (isExtensionStreamUrl(thumbnailSourceUrl)) {
    try {
      const resp = fetchViaExtension(thumbnailSourceUrl);
      const blob = await resp.blob();
      const contentType = resp.headers.get('content-type') || blob.type || 'image/jpeg';
      return { blob, contentType };
    } catch (err) {
      console.warn('[ambrosia] extension thumbnail stream failed:', err);
      return null;
    }
  }
  if (!isExtensionInstalled()) await waitForExtension(300);
  if (isExtensionInstalled() && !/^blob:/i.test(thumbnailSourceUrl)) {
    try {
      const { blob, contentType } = await fetchBytesViaExtension(thumbnailSourceUrl);
      return { blob, contentType };
    } catch (err) {
      console.warn('[ambrosia] extension thumbnail fetch failed:', err);
    }
  }
  try {
    const resp = await fetch(thumbnailSourceUrl);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const contentType = resp.headers.get('content-type') || blob.type || 'image/jpeg';
    return { blob, contentType };
  } catch (err) {
    console.warn('[ambrosia] thumbnail fetch failed:', err);
    return null;
  }
}

// Build the metadata blob we attach to every uploaded Sia object. Stays
// consistent across the single-upload, packed-batch, and thumbnail paths
// so the sync-from-Sia flow can reconstruct a full library entry from
// what's stored on the network alone.
// Metadata schema v3.
//
// Flat fields are stable identity/descriptive data — readers from any
// schema version can rely on them existing.
//
// `refs` is a forward-compatible bag of pointers to other Sia objects in
// the same post. Today we only use `refs.thumbnail`; adding `refs.audio`,
// `refs.preview`, `refs.transcript`, etc. later doesn't require a schema
// bump or a sync rewrite — readers just check for fields they know.
//
// `ext` is a free-form bag for future descriptive fields (chapters, user
// tags, comments) so we don't have to keep widening the top-level shape.
function buildObjectMetadata({ filename, contentType, sourceUrl, role, sizeBytes, title, platform, itemCount, role_index, pageMeta, archivedAt, refs, ext }) {
  return new TextEncoder().encode(JSON.stringify({
    schema: 3,
    name: filename,
    type: contentType,
    sourceUrl,
    role,
    size: sizeBytes || null,
    title: title || null,
    platform: platform || null,
    itemCount: itemCount || null,
    roleIndex: role_index ?? null,
    pageTitle: pageMeta?.pageTitle || null,
    caption: pageMeta?.caption || null,
    author: pageMeta?.author || null,
    siteName: pageMeta?.siteName || null,
    archivedAt: archivedAt || new Date().toISOString(),
    refs: refs && Object.keys(refs).length ? refs : null,
    ext: ext && Object.keys(ext).length ? ext : null,
  }));
}

// Pick the right transport for an item's bytes. Items extracted via
// the extension carry an `ambrosia-ext-stream:` URL that has to be
// fetched through a chrome.runtime port (CORS-free); everything else
// is a normal Cobalt tunnel URL.
function fetchItem(item) {
  if (isExtensionStreamUrl(item.url)) {
    return Promise.resolve(fetchViaExtension(item.url));
  }
  return fetch(item.url);
}

function formatBytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '–';
  if (v >= 1e9) return (v / 1e9).toFixed(2) + ' GB';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + ' MB';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + ' KB';
  return v + ' B';
}

function deriveTitle(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, '');
  } catch { return url; }
}

function safeHostnameOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

// Maps the internal extractor-source strings produced by extractMedia
// to the user-facing labels surfaced in progress UI and archive cards.
// `null` means "don't bother showing it" (used for cases the user
// doesn't care to distinguish from the default media path).
function describeExtractorSource(source) {
  switch (source) {
    case 'gallery-dl': return 'gallery-dl';
    case 'cobalt': return 'Cobalt';
    case 'reddit-fallback': return 'Reddit JSON fallback';
    case 'facebook-fallback': return 'Facebook fallback';
    case 'reddit-thread': return 'Reddit thread API';
    case 'webpage-snapshot': return 'webpage snapshot';
    case 'direct-media': return 'direct media URL';
    default: return null;
  }
}

function deriveFilename(item, contentType, sourceUrl) {
  const base = (() => {
    try {
      const u = new URL(sourceUrl);
      const last = (u.pathname.split('/').filter(Boolean).pop() || u.hostname).slice(0, 60);
      return last || 'archive';
    } catch { return 'archive'; }
  })();
  const ext = extFromMime(contentType) || extFromUrl(item.url) || 'bin';
  const role = item.kind === 'audio' ? '.audio' : '';
  return `${base}${role}.${ext}`;
}

function guessMime(item, url) {
  if (item?.kind === 'audio') return 'audio/mp4';
  // URL-extension match runs before the kind=photo fallback so a
  // gallery-dl photo item with a .png source comes out as image/png
  // instead of getting flattened to image/jpeg. Wikipedia/Commons in
  // particular returns lossless PNGs that should not be relabelled.
  if (/\.mp4(\?|$)/i.test(url)) return 'video/mp4';
  if (/\.webm(\?|$)/i.test(url)) return 'video/webm';
  if (/\.mov(\?|$)/i.test(url)) return 'video/quicktime';
  if (/\.m4a(\?|$)/i.test(url)) return 'audio/mp4';
  if (/\.mp3(\?|$)/i.test(url)) return 'audio/mpeg';
  if (/\.png(\?|$)/i.test(url)) return 'image/png';
  if (/\.webp(\?|$)/i.test(url)) return 'image/webp';
  if (/\.gif(\?|$)/i.test(url)) return 'image/gif';
  if (/\.avif(\?|$)/i.test(url)) return 'image/avif';
  if (/\.svg(\?|$)/i.test(url)) return 'image/svg+xml';
  if (/\.(jpe?g)(\?|$)/i.test(url)) return 'image/jpeg';
  if (item?.kind === 'photo') return 'image/jpeg';
  return 'application/octet-stream';
}

function extFromMime(mime) {
  return ({
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'audio/mp4': 'm4a',
    'audio/webm': 'weba',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  })[(mime || '').split(';')[0].trim().toLowerCase()] || null;
}

function extFromUrl(url) {
  const m = (url || '').match(/\.([a-z0-9]{1,5})(\?|$)/i);
  return m ? m[1].toLowerCase() : null;
}

bootstrap();
