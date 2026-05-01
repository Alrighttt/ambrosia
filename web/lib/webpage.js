// Webpage snapshot capture. Used as a last-resort archive path when no
// extractor (gallery-dl, Cobalt, site-specific fallbacks) can produce
// media for a URL — fetch the HTML and its linked assets via the
// extension's residential-IP fetch so they can be uploaded as
// individual Sia objects under a sia-site manifest.
//
// Coverage tradeoffs:
//   - Captures: <link rel="stylesheet" href>, <img src>, <source src>.
//   - Does NOT capture: <script src> (iframe sandbox blocks scripts
//     anyway), CSS @import / url() (would require a CSS parser),
//     fonts referenced via @font-face, dynamic XHR / fetch from JS,
//     iframe contents.
//   - Result: static / mostly-static pages render acceptably; SPAs
//     and JS-driven pages capture as a dead snapshot of their
//     bootstrap HTML.

import {
  fetchBytesViaExtension,
  fetchFullHtmlViaExtension,
  isExtensionInstalled,
} from './extension.js';

const ASSET_CONCURRENCY = 6;
const MAX_ASSET_BYTES = 2 * 1024 * 1024;     // skip individual assets larger than 2 MB
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;    // tight bundle cap — Sia erasure coding inflates
                                             // shipped bytes ~4x, so 10 MB raw = 40 MB on the
                                             // wire. Beyond that the upload UX feels stuck.

// captureWebpage(sourceUrl) -> { files, pageTitle, sourceUrl, finalUrl, stats }
//
// `files` is a flat list of [{ path, blob, contentType }]. `path` is
// the virtual relative path inside the captured site (e.g.
// `index.html`, `assets/0-css.css`). The HTML's asset references are
// rewritten to point at these virtual paths — when the viewer
// reconstructs the site, it maps each virtual path to a blob URL of
// the downloaded file.
export async function captureWebpage(sourceUrl) {
  if (!isExtensionInstalled()) {
    throw new Error('Webpage capture requires the Ambrosia browser extension.');
  }

  const { body: html, finalUrl } = await fetchFullHtmlViaExtension(sourceUrl);
  if (typeof html !== 'string' || !html.trim()) {
    throw new Error('extension returned empty HTML for ' + sourceUrl);
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Stamp the snapshot with a record of where it came from. Visible
  // inside the archive's HTML even if the manifest is somehow lost.
  const provenance = doc.createElement('meta');
  provenance.name = 'ambrosia-archived-from';
  provenance.content = sourceUrl;
  doc.head?.appendChild(provenance);

  // Strip <script> tags — iframe sandbox without allow-scripts blocks
  // them anyway, and removing them avoids the parser running them
  // when reconstructed. Better to render a clean snapshot than risk
  // a half-loaded SPA throwing JS errors in the iframe console.
  for (const script of doc.querySelectorAll('script')) script.remove();

  // <base href> messes up our virtual-path scheme — drop it.
  for (const baseEl of doc.querySelectorAll('base')) baseEl.remove();

  const assets = collectAssets(doc, finalUrl);
  const fetched = await fetchAssetsBounded(assets, ASSET_CONCURRENCY);

  // Apply byte-budget caps in fetch order, so the most "important"
  // (earlier-in-DOM, usually CSS / above-the-fold images) wins ties.
  let totalBytes = 0;
  for (const asset of fetched) {
    if (!asset.blob) continue;
    if (asset.blob.size > MAX_ASSET_BYTES) {
      asset.blob = null;
      asset.skipReason = `asset > ${MAX_ASSET_BYTES} bytes`;
      continue;
    }
    if (totalBytes + asset.blob.size > MAX_TOTAL_BYTES) {
      asset.blob = null;
      asset.skipReason = 'bundle byte cap reached';
      continue;
    }
    totalBytes += asset.blob.size;
  }

  // Rewrite the HTML element attributes to point at the virtual paths
  // for every successfully-fetched asset. Failed / skipped assets keep
  // their original URL so a re-download in another browser later
  // could conceivably fix them, and so the iframe at least makes the
  // network attempt (which will be CORS-blocked but that's no worse
  // than leaving the attribute pointing at nothing).
  for (const asset of fetched) {
    if (asset.blob) {
      asset.element.setAttribute(asset.attrName, asset.virtualPath);
    }
  }

  const serialized = '<!doctype html>\n' + doc.documentElement.outerHTML;
  const indexBlob = new Blob([serialized], { type: 'text/html; charset=utf-8' });

  const files = [
    { path: 'index.html', blob: indexBlob, contentType: 'text/html; charset=utf-8' },
    ...fetched
      .filter((a) => a.blob)
      .map((a) => ({
        path: a.virtualPath,
        blob: a.blob,
        contentType: a.contentType || guessContentType(a.virtualPath),
      })),
  ];

  // og:image / twitter:image — the page's own preview thumbnail.
  // Used as the library tile thumbnail so webpage snapshots are
  // recognizable in the gallery instead of all looking like generic
  // text cards. Resolved against the page's final URL so relative
  // paths work.
  const ogImageRaw = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
    || doc.querySelector('meta[name="og:image"]')?.getAttribute('content')
    || doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
    || null;
  const thumbnailSourceUrl = ogImageRaw ? absoluteUrl(ogImageRaw, finalUrl || sourceUrl) : null;

  return {
    files,
    pageTitle: (doc.title || '').trim() || null,
    sourceUrl,
    finalUrl: finalUrl || sourceUrl,
    thumbnailSourceUrl,
    stats: {
      assetsFound: assets.length,
      assetsCaptured: files.length - 1,
      assetsFailed: fetched.filter((a) => !a.blob).length,
      bundleBytes: files.reduce((sum, f) => sum + f.blob.size, 0),
    },
  };
}

function collectAssets(doc, baseUrl) {
  const assets = [];
  let counter = 0;

  function add(element, attrName, kind, ext) {
    const original = element.getAttribute(attrName);
    if (!original) return;
    const trimmed = original.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('javascript:')) return;
    const url = absoluteUrl(trimmed, baseUrl);
    if (!url) return;
    if (!/^https?:/i.test(url)) return;
    const safeExt = ext ? ext.replace(/[^a-z0-9]/gi, '').slice(0, 5).toLowerCase() : '';
    const path = `assets/${counter}-${kind}${safeExt ? '.' + safeExt : ''}`;
    counter += 1;
    assets.push({ element, attrName, originalUrl: url, kind, virtualPath: path });
  }

  for (const link of doc.querySelectorAll('link[href]')) {
    const rel = (link.getAttribute('rel') || '').toLowerCase();
    if (rel.split(/\s+/).includes('stylesheet')) {
      add(link, 'href', 'css', extFromUrl(link.getAttribute('href')) || 'css');
    } else if (rel.split(/\s+/).some((r) => r === 'icon' || r === 'apple-touch-icon' || r === 'shortcut')) {
      add(link, 'href', 'icon', extFromUrl(link.getAttribute('href')));
    }
  }
  for (const img of doc.querySelectorAll('img[src]')) {
    add(img, 'src', 'img', extFromUrl(img.getAttribute('src')));
  }
  for (const source of doc.querySelectorAll('source[src]')) {
    add(source, 'src', 'src', extFromUrl(source.getAttribute('src')));
  }
  // <video poster> for the still-frame fallback
  for (const v of doc.querySelectorAll('video[poster]')) {
    add(v, 'poster', 'poster', extFromUrl(v.getAttribute('poster')));
  }

  return assets;
}

function absoluteUrl(href, base) {
  try { return new URL(href, base).href; } catch { return null; }
}

function extFromUrl(url) {
  const m = String(url || '').match(/\.([a-z0-9]{1,5})(?:\?|#|$)/i);
  return m ? m[1].toLowerCase() : null;
}

async function fetchAssetsBounded(assets, limit) {
  const out = new Array(assets.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= assets.length) return;
      const asset = assets[idx];
      try {
        const { blob, contentType } = await fetchBytesViaExtension(asset.originalUrl);
        out[idx] = { ...asset, blob, contentType };
      } catch (err) {
        out[idx] = { ...asset, blob: null, contentType: null, error: err.message || String(err) };
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, assets.length) }, () => worker());
  await Promise.all(workers);
  return out;
}

function guessContentType(path) {
  const ext = extFromUrl(path);
  return ({
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
  })[ext] || 'application/octet-stream';
}

// Manifest format constants — kept in this module so the upload and
// reconstruction sides can import the same source-of-truth.
export const SIA_SITE_MANIFEST_TYPE = 'sia-site';
export const SIA_SITE_MANIFEST_VERSION = 1;

export function buildSiteManifest(filesMap) {
  // filesMap is { path: shareUrl, ... }. Returns a Blob ready for
  // upload as the manifest object.
  const manifest = {
    type: SIA_SITE_MANIFEST_TYPE,
    version: SIA_SITE_MANIFEST_VERSION,
    files: filesMap,
  };
  return new Blob([JSON.stringify(manifest)], { type: 'application/json' });
}

// Validate a parsed manifest blob and return its files map. Throws
// with a useful message if the manifest is malformed — caller is
// expected to catch and surface to the user.
export function parseSiteManifest(text) {
  let m;
  try { m = JSON.parse(text); } catch (e) {
    throw new Error('site manifest is not valid JSON: ' + e.message);
  }
  if (!m || typeof m !== 'object') throw new Error('site manifest is not an object');
  if (m.type !== SIA_SITE_MANIFEST_TYPE) {
    throw new Error(`expected manifest type=${SIA_SITE_MANIFEST_TYPE}, got ${JSON.stringify(m.type)}`);
  }
  if (typeof m.version !== 'number' || m.version > SIA_SITE_MANIFEST_VERSION) {
    throw new Error(`unsupported manifest version ${m.version}`);
  }
  if (!m.files || typeof m.files !== 'object') {
    throw new Error('site manifest missing files map');
  }
  return m.files;
}
