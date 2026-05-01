// Wrapper around Cobalt's HTTP API.
// Spec: https://github.com/imputnet/cobalt/blob/main/docs/api.md
//
// `extractMedia` always returns a normalised list of one or more media
// items. For carousel posts (Instagram albums, Twitter threads with
// multiple images, etc.) Cobalt responds with `status: "picker"` and an
// array; we surface that as multiple items so the caller can archive
// each one.

import { getStored } from './storage.js';
import { DEFAULT_COBALT_URL, DEFAULT_META_URL } from './constants.js';
import { GALLERY_DL_SUPPORTED_SITES } from './gallery-dl-sites.js';
import {
  extractViaGalleryDl,
  isExtensionInstalled,
  makeExtensionStreamUrl,
  waitForExtension,
} from './extension.js';
import { extractRedditMedia, fetchRedditThread } from './reddit.js';
import { captureWebpage } from './webpage.js';
import { extractFacebookMedia } from './facebook.js';

export async function cobaltUrl() {
  const stored = await getStored();
  return (stored.cobaltUrl || DEFAULT_COBALT_URL).replace(/\/+$/, '');
}

export function isRedditUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'reddit.com' || host.endsWith('.reddit.com');
  } catch { return false; }
}

function isFacebookUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'facebook.com' || host.endsWith('.facebook.com')
      || host === 'fb.watch' || host === 'fb.com';
  } catch { return false; }
}

// Sites where Cobalt (or our purpose-built fallbacks) is obviously
// better than gallery-dl: video-centric platforms with anti-extraction
// hardening, sites Cobalt has exclusive support for, or sites where
// our hand-tuned extension path beats gallery-dl's Pyodide-bundled
// version. Skipping gallery-dl on these avoids paying its ~5-15s
// cold-start cost for a request that's going to fall through anyway.
//
// Reddit is intentionally NOT in this list — it has video posts (Cobalt
// strong) AND multi-image galleries (gallery-dl strong), so we let
// gallery-dl try first and fall through naturally if it errors.
function isCobaltPreferred(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')
        || host === 'vm.tiktok.com') return true;
    if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.x.com')
        || host.endsWith('.twitter.com')) return true;
    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) return true;
    if (host === 'twitch.tv' || host.endsWith('.twitch.tv')
        || host === 'clips.twitch.tv') return true;
    if (host === 'bsky.app' || host.endsWith('.bsky.app')) return true;
    if (host === 'bilibili.com' || host.endsWith('.bilibili.com')) return true;
    if (host === 'streamable.com' || host.endsWith('.streamable.com')) return true;
    if (host === 'loom.com' || host.endsWith('.loom.com')) return true;
    if (host === 'dailymotion.com' || host.endsWith('.dailymotion.com')) return true;
    // Facebook + Instagram only for video/reel paths — image-archive
    // paths on those sites we'd rather hand off to gallery-dl.
    if ((host === 'facebook.com' || host.endsWith('.facebook.com')
         || host === 'fb.watch' || host === 'fb.com')) return true;
    if ((host === 'instagram.com' || host.endsWith('.instagram.com'))) {
      const path = new URL(url).pathname;
      // /reel/, /p/, /tv/, /reels/ are mostly video / picker; /<user>/
      // bare-profile or stories paths might be better via gallery-dl.
      if (/^\/(reel|p|tv|reels)\//.test(path)) return true;
      return false;
    }
    return false;
  } catch { return false; }
}

function stripUrlFragment(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch { return url; }
}

// Direct media URL (jpg, png, mp4, etc.). The user already has the link
// to the actual file — we just need to archive it. No extractor needed.
function isDirectMediaUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    // Wiki page URLs (Wikimedia Commons File:foo.jpg, MediaWiki File:bar.png)
    // happen to end in a media extension but are actually HTML pages. Skip
    // them so the extractor pipeline (gallery-dl, etc.) handles them
    // properly — gallery-dl has a wikimedia extractor that pulls the real
    // CDN URL out of the page.
    if (/\/wiki\/|\/File:|\/file:/i.test(u.pathname)) return false;
    const ext = u.pathname.split('.').pop()?.toLowerCase();
    return /^(jpg|jpeg|png|webp|gif|avif|mp4|webm|mov|m4v|mp3|m4a|ogg)$/.test(ext || '');
  } catch { return false; }
}

function directMediaItem(sourceUrl) {
  const u = new URL(sourceUrl);
  const ext = u.pathname.split('.').pop()?.toLowerCase() || 'bin';
  const isVideo = /^(mp4|webm|mov|m4v)$/.test(ext);
  const isAudio = /^(mp3|m4a|ogg)$/.test(ext);
  const filename = (u.pathname.split('/').pop() || `media.${ext}`).slice(0, 80);
  // Hosts that don't send permissive CORS for cross-origin fetch get
  // routed through our /media proxy (host-allowlisted in the meta
  // service). Browser fetch from ambrosia-web → fbcdn.net would
  // otherwise CORS-fail at upload time.
  const fetchUrl = isExtensionPreferredMediaHost(u.hostname) && isExtensionInstalled()
    ? makeExtensionStreamUrl(sourceUrl)
    : needsMediaProxy(u.hostname) ? proxyMediaUrl(sourceUrl) : sourceUrl;
  return [{
    kind: isVideo ? 'video' : isAudio ? 'audio' : 'photo',
    url: fetchUrl,
    filename,
    thumbnailUrl: isVideo || isAudio || fetchUrl.startsWith('ambrosia-ext-stream:') ? null : fetchUrl,
  }];
}

function isExtensionPreferredMediaHost(host) {
  const h = host.toLowerCase();
  return h === 'pximg.net' || h.endsWith('.pximg.net');
}

function needsMediaProxy(host) {
  const h = host.toLowerCase();
  return h.endsWith('.fbcdn.net') || h.endsWith('.fbsbx.com')
    || h.endsWith('.cdninstagram.com') || h.endsWith('.tiktokcdn.com')
    || h === 'pximg.net' || h.endsWith('.pximg.net');
}

function proxyMediaUrl(sourceUrl) {
  const base = (DEFAULT_META_URL || '').replace(/\/+$/, '');
  const proxy = new URL('/media', base);
  proxy.searchParams.set('url', sourceUrl);
  return proxy.toString();
}

function galleryDlSiteForUrl(sourceUrl) {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
    return GALLERY_DL_SUPPORTED_SITES
      .filter((site) => host === site.host || host.endsWith('.' + site.host))
      .sort((a, b) => b.host.length - a.host.length)[0] || null;
  } catch {
    return null;
  }
}

function displayGalleryDlSiteName(site) {
  return String(site?.site || 'this site').replace(/^\[(.+)\]$/, '$1');
}

function galleryDlExampleLines(site) {
  const examples = Array.isArray(site?.examples) ? site.examples : [];
  if (!examples.length) return [];
  return examples.map((example) => {
    const label = example.label ? `${example.label}: ` : '';
    return `${label}${example.url}`;
  });
}

function supportedSiteNoMatchError(sourceUrl) {
  const site = galleryDlSiteForUrl(sourceUrl);
  if (!site) return null;
  const lines = galleryDlExampleLines(site);
  const suffix = lines.length
    ? ` Valid URL examples:\n${lines.map((line) => `- ${line}`).join('\n')}`
    : '';
  const err = new Error(
    `${displayGalleryDlSiteName(site)} is supported by gallery-dl, but this URL does not match any known extractor for that site.${suffix}`,
  );
  err.galleryDlNoMatch = true;
  return err;
}

export async function extractMedia(sourceUrl, opts = {}) {
  // URL fragments are client-side only and never reach the server
  // anyway. Strip them before extraction: Cobalt's validator rejects
  // URLs with fragments outright (you'd get a misleading "invalid URL"
  // error), and gallery-dl's regex matchers don't need the noise. Real
  // case: imgur viewer URLs carry `#/t/<tag>` for in-page filtering.
  sourceUrl = stripUrlFragment(sourceUrl);

  // Wait briefly for the extension's presence ping. The rest of the
  // pipeline still works without it, but several layers (gallery-dl,
  // scrape-via-extension) prefer it.
  if (!isExtensionInstalled()) await waitForExtension(800);

  // Manual escape hatch — the user pressed "Try webpage snapshot" after
  // a normal extraction failed. Bypass every extractor and go straight
  // to the captureWebpage path. Throws if the snapshot also fails so
  // the caller gets a real error instead of a no-op success.
  if (opts.forceWebpageSnapshot) {
    if (!isExtensionInstalled()) {
      throw new Error('Webpage snapshot requires the Ambrosia extension.');
    }
    const pageSnapshot = await captureWebpage(sourceUrl);
    if (!pageSnapshot?.files?.length) {
      throw new Error('Webpage snapshot captured no files.');
    }
    return { items: [], thread: null, pageSnapshot, source: 'webpage-snapshot' };
  }

  // Direct media URL? Skip every extractor — the user gave us the file
  // location, we just archive it. This check runs after the extension
  // presence wait so CDN hosts such as Pixiv can use extension-stream
  // fetching instead of CORS-blocked page fetches.
  if (isDirectMediaUrl(sourceUrl)) {
    return { items: directMediaItem(sourceUrl), thread: null, pageSnapshot: null, source: 'direct-media' };
  }

  // Thread-bearing platforms (Reddit today; HN/forums later) get
  // their post body + comments fetched in parallel with media
  // extraction. The archive ends up unified — media tiles + thread
  // text under one library entry. For Reddit text-only posts the
  // media extraction returns empty and the thread alone carries the
  // archive; for media posts both layers contribute.
  const threadPromise = isRedditUrl(sourceUrl)
    ? fetchRedditThread(sourceUrl).catch((err) => {
        console.warn('[ambrosia] reddit thread fetch failed:', err);
        return null;
      })
    : Promise.resolve(null);

  let items = [];
  let source = null;
  let mediaError = null;
  try {
    const r = await extractMediaItemsCore(sourceUrl, opts);
    items = r.items;
    source = r.source;
  } catch (err) {
    mediaError = err;
  }
  const thread = await threadPromise;

  // For thread-bearing URLs, allow zero media when the thread payload
  // succeeded — text-only AskReddit posts and comment-only submissions
  // are now first-class archives. For non-thread URLs, propagate any
  // media error since there's no fallback content.
  if (items.length === 0) {
    if (thread) return { items: [], thread, pageSnapshot: null, source: 'reddit-thread' };

    // Webpage fallback only triggers when NO media extractor "owned"
    // the URL — i.e., gallery-dl didn't match, Cobalt didn't recognize
    // the host, no purpose-built fallback applied. If gallery-dl
    // matched but failed (zero items, auth required, etc.) we let
    // that error surface instead, because falling back to a webpage
    // snapshot would silently produce a degraded archive that hides
    // the real extractor failure (the user thinks they got the post
    // when they actually got a meta page or an error page).
    const extractorOwned = !!mediaError && (
      mediaError.extractorMatched
      || mediaError.zeroItems
      || mediaError.galleryDlNoMatch
    );

    if (isExtensionInstalled() && !extractorOwned) {
      try {
        const pageSnapshot = await captureWebpage(sourceUrl);
        if (pageSnapshot?.files?.length) {
          return { items: [], thread: null, pageSnapshot, source: 'webpage-snapshot' };
        }
      } catch (snapErr) {
        console.warn('[ambrosia] webpage snapshot fallback also failed:', snapErr);
      }
    }

    // Tag the surfaced error so the caller can show a recovery UI
    // (snapshot button + matched-site sample URLs) without re-deriving
    // these flags from scratch.
    const finalErr = mediaError || new Error('No content extracted from this URL');
    finalErr.extractorOwned = extractorOwned;
    throw finalErr;
  }
  return { items, thread, pageSnapshot: null, source };
}

// Inner extractor — runs the existing media-only pipeline (gallery-dl,
// Cobalt, site-specific fallbacks) and returns an items array. Throws
// when no extractor produces media. extractMedia wraps this with
// thread orchestration so that thread platforms can salvage an archive
// when this throws.
async function extractMediaItemsCore(sourceUrl, opts = {}) {

  // 1. gallery-dl in extension (Pyodide-bundled). Covers ~300 sites
  //    upstream. We skip it for sites Cobalt or our purpose-built
  //    fallbacks handle better (TikTok, Vimeo, Twitch, etc.) —
  //    no point paying gallery-dl's cold-start cost for a request that
  //    will fall through anyway. For everything else, gallery-dl tries
  //    first; if no extractor matches OR a matched extractor errors
  //    (auth-walled Pixiv without OAuth, etc.), we fall through so the
  //    site-specific purpose-built fallbacks below still get a turn.
  if (isExtensionInstalled() && !isCobaltPreferred(sourceUrl)) {
    try {
      const items = await extractViaGalleryDl(sourceUrl);
      if (items && items.length > 0) return { items, source: 'gallery-dl' };
      console.info('[ambrosia] gallery-dl returned no items for', sourceUrl);
      // For sites we have purpose-built fallbacks for (Reddit's
      // fallback_url scraping, Facebook's bot-UA bypass), don't
      // short-circuit with the "URL doesn't match" error — let the
      // fallback chain run. The error path below is for sites where
      // gallery-dl IS our only option for that host.
      if (!isRedditUrl(sourceUrl) && !isFacebookUrl(sourceUrl)) {
        const noMatch = supportedSiteNoMatchError(sourceUrl);
        if (noMatch) throw noMatch;
      }
    } catch (err) {
      console.warn('[ambrosia] gallery-dl extraction failed:', err);
      if (err.galleryDlNoMatch) throw err;

      // Matched extractor walked the URL but yielded zero items.
      // Surface this as a definite failure (don't fall through to
      // Cobalt — the right extractor ran and concluded there's
      // nothing here). Common causes are a deleted/private post or
      // an extractor's API key (e.g. imgur Client-ID) being rate-
      // limited. Worth telling the user both possibilities so they
      // know whether to give up or try later.
      if (err.zeroItems) {
        const site = err.extractorCategory || 'this site';
        const e = new Error(
          `${site} extractor matched the URL but returned no media. ` +
          `Three possibilities: (1) the post genuinely has no media — text-only ` +
          `Reddit threads, AskReddit discussions, comment-only posts, etc.; ` +
          `(2) the post is deleted/private/region-locked; ` +
          `(3) ${site}'s API is rate-limiting our default credentials. ` +
          `Try opening the URL in a normal tab — if you see actual photos or ` +
          `videos there, it's case (3) and we need an authenticated extractor path.`,
        );
        // Preserve the diagnostic flags so the outer extractMedia's
        // `extractorOwned` check still recognizes this as "an
        // extractor handled the URL and decided no" — without these
        // flags the webpage-snapshot fallback would silently kick in
        // and produce a misleading degraded archive.
        e.zeroItems = true;
        e.extractorMatched = true;
        e.extractorCategory = err.extractorCategory || null;
        throw e;
      }

      if (err.extractorMatched) {
        const site = err.extractorCategory || 'this site';
        let message;
        if (site === 'pixiv' && /refresh-token/i.test(err.message || '')) {
          message = 'Pixiv requires a gallery-dl OAuth refresh token. Run `gallery-dl oauth:pixiv`, '
            + 'paste the refresh token into the Ambrosia Firefox extension popup, then retry the Pixiv artwork URL.';
        } else {
          message = `${site} needs you to be logged in for Ambrosia to fetch this content (${err.message.toLowerCase()}). `
            + `Open ${site} in another tab in this browser, sign in, then retry. `
            + `If the source still won't load, paste the direct media URL (right-click → Copy image/video link) instead.`;
        }
        const e = new Error(message);
        e.extractorMatched = true;
        e.extractorCategory = err.extractorCategory || null;
        throw e;
      }

      // gallery-dl bridge reported an error before matching — most
      // likely an extractor.find exception. Show the raw cause; this
      // beats the previous behavior of falling through to a generic
      // "URL doesn't match" message that hid the real failure.
      if (err.galleryDlResponse?.error) {
        const e = new Error(`gallery-dl couldn't process this URL: ${err.galleryDlResponse.error}`);
        // Treat as extractor-owned: the right extractor ran (matched
        // or attempted to match) and surfaced an error. Falling back
        // to a webpage snapshot would hide the real cause.
        e.extractorMatched = !!err.galleryDlResponse.matched;
        e.galleryDlResponse = err.galleryDlResponse;
        throw e;
      }
    }
  }

  // 2. Cobalt server-side. Still our workhorse for major video
  //    platforms with mature extractors and good streaming.
  try {
    const items = await extractMediaViaCobalt(sourceUrl, opts);
    return { items, source: 'cobalt' };
  } catch (err) {
    if (isRedditUrl(sourceUrl)) {
      try {
        const items = await extractMediaViaRedditFallbacks(sourceUrl);
        return { items, source: 'reddit-fallback' };
      } catch (fallbackErr) {
        console.warn('[ambrosia] reddit fallback extraction failed:', fallbackErr);
        // Surface both underlying errors so we can tell whether Cobalt
        // refused, our /extract meta-service refused, or both. Without
        // this the user (and we) just see the generic "Reddit blocked"
        // string and can't tell why a Reddit video that should work via
        // Cobalt didn't.
        const cobaltMsg = err?.message || String(err) || 'unknown';
        const fallbackMsg = fallbackErr?.message || String(fallbackErr) || 'unknown';
        throw new Error(
          `Reddit extraction failed.\n` +
          `Cobalt said: ${cobaltMsg}\n` +
          `Fallback said: ${fallbackMsg}\n` +
          `If you see this on Safari iOS, the most common cause is Cobalt timing out on a Reddit-side fetch — retrying in a minute usually works. ` +
          `If retries keep failing, copy the URL into a Firefox tab with the Ambrosia extension installed and archive it there.`,
        );
      }
    }
    if (isFacebookUrl(sourceUrl)) {
      // Server-side path first: works for PHOTO share links without the
      // extension. The meta service uses a Slackbot UA which Facebook
      // serves real og: tags to (their link-preview pipeline). Falls
      // through to the extension for videos / private content.
      try {
        const items = await extractMediaViaMetaService(sourceUrl);
        return { items, source: 'facebook-fallback' };
      } catch (serverErr) {
        console.warn('[ambrosia] facebook server extraction failed, trying extension:', serverErr);
      }
      try {
        const items = await extractFacebookMedia(sourceUrl);
        return { items, source: 'facebook-fallback' };
      } catch (fallbackErr) {
        console.warn('[ambrosia] facebook fallback extraction failed:', fallbackErr);
        throw new Error(
          fallbackErr.message ||
          'Facebook blocked automated extraction for this post. Install the Ambrosia browser extension and try again.',
        );
      }
    }
    // Cobalt failed and we have no site-specific fallback. If the
    // extension isn't installed, the user's best bet is to install it
    // — gallery-dl in the extension covers ~300 sites Cobalt doesn't.
    if (!isExtensionInstalled()) {
      const noMatch = supportedSiteNoMatchError(sourceUrl);
      if (noMatch) {
        throw new Error(
          `${noMatch.message}\n\nInstall the Ambrosia browser extension to use gallery-dl extraction for supported sites.`,
        );
      }
      throw new Error(
        `Couldn't extract media from this URL. Cobalt doesn't support this site, and the Ambrosia browser extension isn't installed in this browser. ` +
        `Install the extension to unlock gallery-dl support for ~300 more sites (Pixiv, DeviantArt, Tumblr, Imgur albums, etc.). ` +
        `Original error: ${err.message || err}`,
      );
    }
    throw err;
  }
}

async function extractMediaViaRedditFallbacks(sourceUrl) {
  try {
    return await extractRedditMedia(sourceUrl);
  } catch (err) {
    console.warn('[ambrosia] client-side reddit extraction failed:', err);
  }
  return await extractMediaViaMetaService(sourceUrl);
}

async function extractMediaViaCobalt(sourceUrl, opts = {}) {
  const base = await cobaltUrl();
  const body = {
    url: sourceUrl,
    videoQuality: cappedQuality(sourceUrl, opts.videoQuality),
    audioFormat: opts.audioFormat || 'best',
    filenameStyle: 'pretty',
    downloadMode: 'auto',
    // Force Cobalt to tunnel every item through its own server. Without
    // this, picker responses (Instagram carousels, Twitter threads) return
    // direct CDN URLs that the browser can't fetch — Instagram's CDN
    // doesn't send Access-Control-Allow-Origin. Tunnelling routes the
    // bytes through our Cobalt instance, which we control and serves the
    // right CORS headers.
    alwaysProxy: true,
    ...opts.extra,
  };
  const resp = await fetch(base + '/', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    let code = '';
    try { code = (await resp.json())?.error?.code || ''; } catch (_) {}
    throw new Error(friendlyError(code) || `Cobalt HTTP ${resp.status}${code ? ': ' + code : ''}`);
  }
  const data = await resp.json();
  return normalise(data);
}

async function extractMediaViaMetaService(sourceUrl) {
  const base = DEFAULT_META_URL.replace(/\/+$/, '');
  const resp = await fetch(`${base}/extract?url=${encodeURIComponent(sourceUrl)}`, {
    headers: { 'accept': 'application/json' },
  });
  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.json())?.error || ''; } catch (_) {}
    throw new Error(detail || `fallback extractor HTTP ${resp.status}`);
  }
  const data = await resp.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) throw new Error('fallback extractor returned no media items');
  return items.map((item) => ({
    kind: item.kind === 'photo' ? 'photo' : item.kind === 'audio' ? 'audio' : 'video',
    url: absolutize(base, item.url),
    filename: item.filename || null,
    thumbnailUrl: item.thumbnailUrl ? absolutize(base, item.thumbnailUrl) : null,
  }));
}

// Map Cobalt's internal error codes to user-readable text. Codes that
// aren't in this table fall through to the raw "Cobalt HTTP 400: <code>"
// format so we can still see the underlying signal in dev tools.
const FRIENDLY_ERRORS = {
  'error.api.content.video.unavailable':
    'The source platform says this video is unavailable here (private, deleted, region-locked, or no streams at the requested quality).',
  'error.api.content.post.unavailable':
    'The source platform says this post is unavailable (deleted, private, or region-locked).',
  'error.api.content.post.private':
    'This post is private. Ambrosia can only archive public content.',
  'error.api.link.unsupported':
    'Cobalt doesn\'t recognize this URL. Check the address and try again.',
  'error.api.link.invalid':
    'That doesn\'t look like a valid URL.',
  'error.api.fetch.short_link':
    'That looks like a profile or short link, not a single post. Open the specific video / photo / post you want to archive and paste its full URL.',
  'error.api.fetch.critical':
    'Cobalt couldn\'t handle that URL. Try the canonical post URL (open the post directly and copy from the address bar).',
  'error.api.rate_exceeded':
    'Too many requests in a short window. Wait a minute and try again.',
  'error.api.fetch.empty':
    'Cobalt fetched the source but it returned no content. Probably a transient issue — try again.',
  'error.api.fetch.fail':
    'Cobalt couldn\'t reach the source platform. Probably a transient issue — try again.',
};

function friendlyError(code) {
  return FRIENDLY_ERRORS[code] || null;
}

// No platform-specific quality cap currently — Cobalt's "max" picks
// the best available variant per source.
function cappedQuality(url, requested) {
  return requested || 'max';
}

function absolutize(base, url) {
  try { return new URL(url, base).href; } catch { return url; }
}

function normalise(data) {
  switch (data.status) {
    case 'redirect':
    case 'tunnel':
    case 'stream':
      return [{
        kind: 'media',
        url: data.url,
        filename: data.filename || null,
        thumbnailUrl: null,
      }];
    case 'picker': {
      const items = (data.picker || []).map((p) => ({
        kind: p.type === 'photo' ? 'photo' : 'video',
        url: p.url,
        filename: null,
        thumbnailUrl: p.thumb || null,
      }));
      // Some picker responses also include a separate audio stream
      // (e.g. multi-image posts with background music).
      if (data.audio) {
        items.push({ kind: 'audio', url: data.audio, filename: null });
      }
      return items;
    }
    case 'error': {
      const code = data.error?.code || 'unknown';
      throw new Error(`Cobalt error: ${code}`);
    }
    default:
      throw new Error(`Cobalt returned unexpected status: ${data.status}`);
  }
}
