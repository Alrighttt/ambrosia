import { DEFAULT_META_URL } from './constants.js';
import { fetchJsonViaExtension, isExtensionInstalled, waitForExtension } from './extension.js';

export async function extractRedditMedia(sourceUrl) {
  const post = await fetchRedditPost(sourceUrl);
  if (!post) throw new Error('could not load Reddit post data');

  const mediaPost = pickRedditMediaPost(post);
  const fallbackVideo = decodeEntities(
    mediaPost?.secure_media?.reddit_video?.fallback_url
      || mediaPost?.media?.reddit_video?.fallback_url
      || mediaPost?.preview?.reddit_video_preview?.fallback_url
      || '',
  );
  const thumb = proxiedMediaUrl(redditThumbnailUrl(mediaPost) || redditThumbnailUrl(post));

  if (fallbackVideo) {
    return [{
      kind: 'video',
      url: proxiedMediaUrl(fallbackVideo),
      filename: redditFilename(post, 'mp4'),
      thumbnailUrl: thumb,
    }];
  }

  const gallery = redditGalleryItems(mediaPost, post);
  if (gallery.length) return gallery;

  const imageUrl = redditImageUrl(mediaPost);
  if (imageUrl) {
    return [{
      kind: 'photo',
      url: proxiedMediaUrl(imageUrl),
      filename: redditFilename(post, extensionFromUrl(imageUrl) || 'jpg'),
      thumbnailUrl: thumb || proxiedMediaUrl(imageUrl),
    }];
  }

  throw new Error('no extractable media found');
}

export async function scrapeRedditMeta(sourceUrl) {
  const post = await fetchRedditPost(sourceUrl);
  if (!post) return emptyMeta();

  return {
    pageTitle: nonEmpty(post.title),
    caption: nonEmpty(post.selftext),
    author: post.author ? `u/${post.author}` : null,
    siteName: nonEmpty(post.subreddit_name_prefixed) || 'Reddit',
    thumbnailUrl: proxiedMediaUrl(redditThumbnailUrl(post)),
    extra: {
      subreddit: post.subreddit_name_prefixed || null,
      score: post.score ?? null,
      numComments: post.num_comments ?? null,
      flair: post.link_flair_text || null,
      over18: !!post.over_18,
    },
  };
}

async function fetchRedditPost(sourceUrl) {
  const data = await fetchRedditFullData(sourceUrl);
  return data ? extractListingPost(data) : null;
}

// Fetches the entire `[post-listing, comments-listing]` payload that
// Reddit's `.json` endpoints return. Used by the post extractor (which
// only cares about element [0]) and the thread extractor (which also
// walks element [1] for the comment tree). Tries direct fetch first,
// falls back to the extension if Reddit is gating the cloud-host IP.
async function fetchRedditFullData(sourceUrl) {
  const direct = await tryFetchRedditFullData(sourceUrl);
  if (direct) return direct;

  if (!isExtensionInstalled()) await waitForExtension(800);
  if (!isExtensionInstalled()) return null;

  return await tryFetchRedditFullDataViaExtension(sourceUrl);
}

async function tryFetchRedditFullData(sourceUrl) {
  for (const endpoint of redditJsonEndpoints(sourceUrl)) {
    try {
      const resp = await fetch(endpoint, {
        headers: { accept: 'application/json' },
      });
      if (!resp.ok) continue;
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) continue;
      const data = await resp.json();
      if (extractListingPost(data)) return data;
    } catch (err) {
      console.warn('[ambrosia] reddit browser fetch failed:', endpoint, err);
    }
  }
  return null;
}

async function tryFetchRedditFullDataViaExtension(sourceUrl) {
  for (const endpoint of redditJsonEndpoints(sourceUrl)) {
    try {
      const { body } = await fetchJsonViaExtension(endpoint);
      if (extractListingPost(body)) return body;
    } catch (err) {
      console.warn('[ambrosia] reddit extension fetch failed:', endpoint, err);
    }
  }
  return null;
}

// Fetch the post body + threaded comments for archiving. Returns
// `{ post, comments }` or null if the URL isn't a fetchable Reddit
// submission. Comment count and depth are bounded so a wildly-popular
// thread doesn't bloat the archive object — top `maxCount` comments
// (Reddit's own API ordering, typically "best") to depth `maxDepth`.
export async function fetchRedditThread(sourceUrl, opts = {}) {
  const maxCount = Number.isFinite(opts.maxCount) ? opts.maxCount : 100;
  const maxDepth = Number.isFinite(opts.maxDepth) ? opts.maxDepth : 3;

  const data = await fetchRedditFullData(sourceUrl);
  if (!data) return null;

  const rawPost = extractListingPost(data);
  if (!rawPost) return null;

  const post = extractPostFields(rawPost);
  const commentRoots = data?.[1]?.data?.children || [];
  const comments = extractCommentTree(commentRoots, maxCount, maxDepth);

  return { post, comments };
}

function extractPostFields(post) {
  const permalink = typeof post.permalink === 'string' && post.permalink
    ? `https://www.reddit.com${post.permalink}`
    : null;
  return {
    id: post.id || null,
    title: post.title || '',
    author: post.author || '[deleted]',
    subreddit: post.subreddit_name_prefixed || (post.subreddit ? `r/${post.subreddit}` : null),
    score: post.score ?? 0,
    upvote_ratio: post.upvote_ratio ?? null,
    num_comments: post.num_comments ?? 0,
    created_utc: post.created_utc ?? 0,
    selftext: post.selftext || '',
    permalink,
    url: post.url || null,
    is_self: !!post.is_self,
    over_18: !!post.over_18,
    spoiler: !!post.spoiler,
    flair: post.link_flair_text || null,
  };
}

function extractCommentTree(rootChildren, maxCount, maxDepth) {
  let captured = 0;
  const result = [];

  function walk(child, depth) {
    if (captured >= maxCount) return null;
    if (depth > maxDepth) return null;
    // Reddit uses kind `t1` for actual comments and `more` for the
    // "load more comments" placeholders. Skip `more` — we'd need to
    // re-call the API to fetch them, and those tail comments are
    // rarely worth the extra round trips for archive purposes.
    if (child?.kind !== 't1') return null;
    const d = child.data;
    if (!d || d.body == null) return null;
    captured += 1;

    const replies = [];
    const replyChildren = d.replies?.data?.children || [];
    for (const reply of replyChildren) {
      if (captured >= maxCount) break;
      const node = walk(reply, depth + 1);
      if (node) replies.push(node);
    }

    const out = {
      author: d.author || '[deleted]',
      body: d.body,
      score: d.score ?? 0,
      created_utc: d.created_utc ?? 0,
    };
    if (d.is_submitter) out.is_op = true;
    if (d.distinguished) out.distinguished = d.distinguished;
    if (replies.length) out.replies = replies;
    return out;
  }

  for (const c of rootChildren) {
    if (captured >= maxCount) break;
    const node = walk(c, 0);
    if (node) result.push(node);
  }

  return result;
}

function redditJsonEndpoints(sourceUrl) {
  const u = new URL(sourceUrl);
  const path = u.pathname.replace(/\/$/, '');
  return [
    `https://api.reddit.com${path}`,
    `https://www.reddit.com${path}/.json?raw_json=1`,
  ];
}

function extractListingPost(data) {
  return data?.[0]?.data?.children?.[0]?.data || null;
}

function pickRedditMediaPost(post) {
  const candidates = [post, ...(post?.crosspost_parent_list || [])];
  return candidates.find((candidate) => {
    if (!candidate) return false;
    if (candidate.secure_media?.reddit_video?.fallback_url) return true;
    if (candidate.media?.reddit_video?.fallback_url) return true;
    if (candidate.preview?.reddit_video_preview?.fallback_url) return true;
    if (candidate.gallery_data?.items?.length && candidate.media_metadata) return true;
    return !!redditImageUrl(candidate);
  }) || post;
}

function redditThumbnailUrl(post) {
  return decodeEntities(
    post?.preview?.images?.[0]?.source?.url
      || (validImage(post?.thumbnail) ? post.thumbnail : '')
      || '',
  ) || null;
}

function redditImageUrl(post) {
  const direct = decodeEntities(post?.url_overridden_by_dest || post?.url || '');
  if (!validImage(direct)) return null;

  try {
    const u = new URL(direct);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const ext = extensionFromUrl(direct);
    if (host === 'i.redd.it' || host === 'preview.redd.it' || host === 'external-preview.redd.it') {
      return direct;
    }
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return direct;
  } catch (_) {}

  return null;
}

function redditGalleryItems(post, rootPost) {
  const order = post?.gallery_data?.items || [];
  const meta = post?.media_metadata || {};
  const thumb = proxiedMediaUrl(redditThumbnailUrl(post) || redditThumbnailUrl(rootPost));
  const items = [];

  for (const entry of order) {
    const media = meta[entry.media_id];
    const source = decodeEntities(media?.s?.u || media?.s?.gif || '');
    if (!validImage(source)) continue;
    items.push({
      kind: 'photo',
      url: proxiedMediaUrl(source),
      filename: redditFilename(rootPost, extensionFromUrl(source) || 'jpg', items.length + 1),
      thumbnailUrl: thumb || proxiedMediaUrl(source),
    });
  }

  return items;
}

function redditFilename(post, ext = 'bin', index = null) {
  const slug = String(post?.title || post?.id || 'reddit')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'reddit';
  const suffix = index == null ? '' : `-${index}`;
  return `${slug}${suffix}.${ext}`;
}

function proxiedMediaUrl(sourceUrl) {
  if (!sourceUrl) return null;
  const base = DEFAULT_META_URL.replace(/\/+$/, '');
  const proxy = new URL('/media', base);
  proxy.searchParams.set('url', sourceUrl);
  return proxy.toString();
}

function validImage(s) {
  return typeof s === 'string' && /^https?:\/\//.test(s);
}

function extensionFromUrl(url) {
  const m = String(url || '').match(/\.([a-z0-9]{1,5})(?:\?|$)/i);
  return m ? m[1].toLowerCase() : null;
}

function emptyMeta() {
  return { pageTitle: null, caption: null, author: null, siteName: null, thumbnailUrl: null, extra: null };
}

function nonEmpty(v) {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed ? trimmed : null;
}

function decodeEntities(s) {
  if (!s) return s;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = s;
  return textarea.value;
}
