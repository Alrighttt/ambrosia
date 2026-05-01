import { DEFAULT_META_URL } from './constants.js';
import { fetchUrlViaExtension, isExtensionInstalled, waitForExtension } from './extension.js';

// Extract directly-archivable media (video or photo) from a Facebook
// share / story / watch / reel / photo page. Cobalt only handles video
// + reel patterns AND fly.io's IP is blocked by Facebook regardless,
// so this is the working path for everything Cobalt can't do. Requires
// the extension — only the user's logged-in browser can reach Facebook
// from a residential IP with their session.
export async function extractFacebookMedia(sourceUrl) {
  if (!isExtensionInstalled()) await waitForExtension(800);
  if (!isExtensionInstalled()) {
    throw new Error(
      'Facebook blocks cloud-hosted scrapers. Install the Ambrosia browser ' +
      'extension and try again from this browser.',
    );
  }

  const { body, finalUrl } = await fetchUrlViaExtension(sourceUrl);
  if (!body) throw new Error('Facebook returned empty body');

  const og = (prop) => matchMeta(body, 'property', prop) || matchMeta(body, 'name', prop);
  const title = og('og:title');
  const thumbUrl = og('og:image');

  // Video first (more specific signal). If a playable video URL exists,
  // it's always a video post; photo metadata might be co-present
  // (preview thumbnail) but the video is the real content.
  const videoUrl = pickVideoUrl(body);
  if (videoUrl) {
    return [{
      kind: 'video',
      url: proxiedMediaUrl(videoUrl),
      filename: facebookFilename(title || sourceUrl, 'mp4'),
      thumbnailUrl: thumbUrl ? proxiedMediaUrl(thumbUrl) : null,
    }];
  }

  // Photo post — Cobalt's URL patterns don't match `/share/<id>` (no
  // shareType), but Facebook serves the full-res image URL right in the
  // og:image meta tag. For single-photo posts that's all we need; for
  // carousels we additionally pull the inline JSON's image array.
  const photos = pickPhotoUrls(body, thumbUrl);
  if (photos.length > 0) {
    return photos.map((photoUrl, i) => ({
      kind: 'photo',
      url: proxiedMediaUrl(photoUrl),
      filename: facebookFilename(title || sourceUrl, extensionFromUrl(photoUrl) || 'jpg', photos.length > 1 ? i + 1 : null),
      thumbnailUrl: proxiedMediaUrl(thumbUrl || photoUrl),
    }));
  }

  throw new Error(
    'No playable video or photo found on the Facebook page. ' +
    'It may be private, deleted, or use a format we don\'t recognize.',
  );
}

// Pull the playable URL out of Facebook's inline JSON. They serve
// several variants depending on the page type (share/v/, story.php,
// watch/, /<user>/videos/). All are JSON-string-encoded — backslash
// escapes need decoding before the URL is fetchable.
function pickVideoUrl(html) {
  const patterns = [
    /"playable_url_quality_hd":"([^"]+)"/,
    /"browser_native_hd_url":"([^"]+)"/,
    /"playable_url":"([^"]+)"/,
    /"browser_native_sd_url":"([^"]+)"/,
    /<meta[^>]+property=["']og:video:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (!m || !m[1]) continue;
    const decoded = decodeJsonString(m[1]);
    if (/^https?:\/\//.test(decoded)) return decoded;
  }
  return null;
}

function decodeJsonString(s) {
  return s
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"');
}

// Photo posts: the full-res image is in og:image, plus carousels expose
// the rest of the album in inline JSON. Walk the page for any
// scontent-/fbcdn-hosted image URLs that look like photos and dedupe.
function pickPhotoUrls(html, ogImage) {
  const found = new Set();
  if (ogImage && /^https?:\/\//.test(ogImage)) found.add(ogImage);

  // Inline JSON: image objects look like
  //   "image":{"uri":"https://scontent...","height":...,"width":...}
  // or paired image1/image2 properties for albums. We grab any uri whose
  // path looks like an image extension and host is on Facebook's CDN.
  const re = /"uri":"(https:\\?\/\\?\/[^"]+?\.(?:jpg|jpeg|png|webp|gif)[^"]*?)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = decodeJsonString(m[1]);
    if (isFacebookCdnUrl(url)) found.add(url);
  }

  // Filter out obvious thumbnails (low-res variants share the same path
  // with smaller `_n` / `_s` suffixes; the og:image is usually the
  // canonical highest-res version we keep).
  return [...found];
}

function isFacebookCdnUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith('.fbcdn.net') || host.endsWith('.fbsbx.com')
      || host === 'scontent.xx.fbcdn.net';
  } catch { return false; }
}

function extensionFromUrl(url) {
  const m = String(url || '').match(/\.([a-z0-9]{1,5})(?:\?|$)/i);
  return m ? m[1].toLowerCase() : null;
}

function matchMeta(html, attr, value) {
  const v = escapeRegex(value);
  const a = escapeRegex(attr);
  const patterns = [
    new RegExp(`<meta[^>]+${a}=["']${v}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${a}=["']${v}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function facebookFilename(seed, ext = 'mp4', index = null) {
  const slug = String(seed)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'facebook';
  const suffix = index == null ? '' : `-${index}`;
  return `${slug}${suffix}.${ext}`;
}

// Route the CDN URL through our /media proxy so the upload-side fetch
// is same-origin. Facebook video CDN (video.fbcdn.net) doesn't send
// permissive CORS headers; the proxy is host-allowlisted on the
// scraping service to keep it from becoming a generic open relay.
function proxiedMediaUrl(sourceUrl) {
  if (!sourceUrl) return null;
  const base = DEFAULT_META_URL.replace(/\/+$/, '');
  const proxy = new URL('/media', base);
  proxy.searchParams.set('url', sourceUrl);
  return proxy.toString();
}
