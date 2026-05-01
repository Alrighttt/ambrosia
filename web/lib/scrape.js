import { DEFAULT_META_URL } from './constants.js';
import { fetchUrlViaExtension, isExtensionInstalled, waitForExtension } from './extension.js';
import { scrapeRedditMeta } from './reddit.js';

// Pull page metadata (title, caption, author, site name, thumbnail) for
// the source URL. Two-tier strategy:
//
//   1. If the extension is installed, fetch the URL through it. The
//      extension runs from the user's residential IP with their session
//      cookies, so login-walled platforms (Instagram, Reddit, Facebook,
//      LinkedIn) return their real authenticated HTML and we can read
//      the actual caption + thumbnail from the og: tags. The server-side
//      scraper running on fly.io can't do this — those sites hand the
//      anonymous shell to cloud IPs.
//   2. Otherwise, fall through to the server scraper. It handles the
//      common cases (Vimeo/TikTok via oEmbed, Reddit via the .json
//      endpoint, og: tags for everything else) and is fine for sites
//      that don't gate metadata behind login.
//
// Best-effort: returns an empty record on any failure.
export async function scrapePageMeta(sourceUrl) {
  if (!sourceUrl) return emptyMeta();

  if (!isExtensionInstalled()) await waitForExtension(250);

  if (isRedditUrl(sourceUrl)) {
    try {
      const meta = await scrapeRedditMeta(sourceUrl);
      if (hasMeaningfulMeta(meta)) return meta;
    } catch (err) {
      console.warn('[ambrosia] reddit scrape failed, falling back:', err);
    }
  }

  if (isExtensionInstalled()) {
    try {
      const meta = await scrapeViaExtension(sourceUrl);
      if (hasMeaningfulMeta(meta)) return meta;
    } catch (err) {
      console.warn('[ambrosia] extension scrape failed, falling back:', err);
    }
  }

  return await scrapeViaServer(sourceUrl);
}

async function scrapeViaServer(sourceUrl) {
  const base = DEFAULT_META_URL.replace(/\/+$/, '');
  try {
    const resp = await fetch(`${base}/scrape?url=${encodeURIComponent(sourceUrl)}`, {
      headers: { 'accept': 'application/json' },
    });
    if (!resp.ok) return emptyMeta();
    const data = await resp.json();
    return {
      pageTitle: nonEmpty(data.pageTitle),
      caption: nonEmpty(data.caption),
      author: nonEmpty(data.author),
      siteName: nonEmpty(data.siteName),
      thumbnailUrl: nonEmpty(data.thumbnailUrl),
      extra: data.extra || null,
    };
  } catch (err) {
    console.warn('[ambrosia] server scrape failed:', err);
    return emptyMeta();
  }
}

async function scrapeViaExtension(sourceUrl) {
  const { body, finalUrl } = await fetchUrlViaExtension(sourceUrl);
  if (!body) return emptyMeta();
  return parseMetaFromHtml(body, finalUrl || sourceUrl);
}

function isRedditUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'reddit.com' || host.endsWith('.reddit.com');
  } catch {
    return false;
  }
}

function hasMeaningfulMeta(meta) {
  return !!(meta && (meta.caption || meta.author || meta.thumbnailUrl
    || (meta.pageTitle && meta.pageTitle !== meta.siteName)));
}

// ─── og: / twitter: / <title> parser ───
//
// Mirrors the server-side regex parser but runs in the browser. We don't
// reach for DOMParser because some platforms ship malformed HTML that
// trips it up — pure regex against meta tags is more permissive.

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  ndash: '–', mdash: '—', hellip: '…', bull: '•',
  middot: '·', copy: '©', reg: '®', trade: '™',
  laquo: '«', raquo: '»', deg: '°', times: '×',
};

function parseMetaFromHtml(html, baseUrl) {
  const og = (prop) => matchMeta(html, 'property', prop) || matchMeta(html, 'name', prop);
  const tw = (name) => matchMeta(html, 'name', name);
  const titleTag = (() => {
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return m ? decodeEntities(m[1].trim()) : null;
  })();
  const captionRaw = nonEmpty(og('og:description') || tw('twitter:description') || tw('description'));
  return {
    pageTitle: nonEmpty(og('og:title') || tw('twitter:title') || titleTag),
    caption: dropPlatformBoilerplate(captionRaw),
    author: nonEmpty(og('article:author') || og('og:author') || tw('twitter:creator')),
    siteName: nonEmpty(og('og:site_name')),
    thumbnailUrl: nonEmpty(absolutize(og('og:image') || tw('twitter:image'), baseUrl)),
    extra: null,
  };
}

// Several platforms serve the same site-wide marketing tagline as
// og:description for every page (often because the per-page meta
// hasn't been set, the page is login-walled to anonymous scrapers,
// or the platform just doesn't bother). Storing those as the archive
// "caption" is misleading — the user expects a real caption tied to
// the post they archived, not the platform's About-page blurb. Match
// known boilerplate strings and drop them.
const PLATFORM_BOILERPLATE_RX = [
  // Twitch homepage description
  /^Twitch is the world's leading video platform and community for gamers/i,
  // Older Twitch variants
  /^Twitch is the world.s leading live streaming platform/i,
  // Generic fallbacks for sites that serve the same string everywhere
  /^Reddit is a network of communities/i,
  /^Reddit gives you the best of the internet/i,
  /^Vimeo is the home for high quality videos and the people who love them/i,
  /^TikTok - trends start here/i,
  /^Watch trending videos for you/i,             // bare TikTok homepage
  /^Discover short videos? on TikTok/i,
  /^See posts, photos and more on Facebook/i,
  /^Log in to Facebook/i,
  /^Log in or sign up to view/i,
  /^Browse all photos and videos shared on Instagram/i,
];

function dropPlatformBoilerplate(text) {
  if (!text) return null;
  const trimmed = text.trim();
  for (const rx of PLATFORM_BOILERPLATE_RX) {
    if (rx.test(trimmed)) return null;
  }
  return trimmed || null;
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
    if (m && m[1]) return decodeEntities(m[1]);
  }
  return null;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeEntities(s) {
  if (!s) return s;
  let prev;
  let cur = s;
  for (let i = 0; i < 4 && prev !== cur; i++) {
    prev = cur;
    cur = cur
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
        try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; }
      })
      .replace(/&#(\d+);/g, (_, n) => {
        try { return String.fromCodePoint(Number(n)); } catch { return _; }
      })
      .replace(/&([a-z]+);/gi, (m, name) => {
        const k = name.toLowerCase();
        return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, k) ? NAMED_ENTITIES[k] : m;
      });
  }
  return cur;
}

function absolutize(url, baseUrl) {
  if (!url) return null;
  try { return new URL(url, baseUrl).href; } catch { return url; }
}

function emptyMeta() {
  return { pageTitle: null, caption: null, author: null, siteName: null, thumbnailUrl: null, extra: null };
}

function nonEmpty(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t : null;
}
