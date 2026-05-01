// Cobalt-supported sites surfaced in Ambrosia's "Supported sites"
// browser. Cobalt extracts these server-side, so they work in browsers
// without the Ambrosia extension installed (unlike gallery-dl which
// runs via Pyodide in the extension).
//
// Source-of-truth: https://github.com/imputnet/cobalt#supported-services
// Keep this list curated to the major / well-known sources — Cobalt
// supports niche corners we don't need to advertise here.
export const COBALT_SUPPORTED_SITES = [
  {
    site: 'TikTok',
    url: 'https://www.tiktok.com/',
    host: 'tiktok.com',
    capabilities: 'Videos, Photo Slideshows',
    auth: '',
    examples: [
      { label: 'Video', url: 'https://www.tiktok.com/@unicornfinalgirl/video/7412685464676666657' },
    ],
  },
  {
    site: 'Instagram',
    url: 'https://www.instagram.com/',
    host: 'instagram.com',
    capabilities: 'Reels, Posts, Stories (public)',
    auth: '',
    examples: [
      { label: 'Reel', url: 'https://www.instagram.com/reel/Cxxxxxxxxx/' },
      { label: 'Post', url: 'https://www.instagram.com/p/Cxxxxxxxxx/' },
    ],
  },
  {
    site: 'X (Twitter)',
    url: 'https://x.com/',
    host: 'x.com',
    capabilities: 'Videos, GIFs, Images on tweets',
    auth: '',
    examples: [
      { label: 'Tweet', url: 'https://x.com/elonmusk/status/1234567890' },
    ],
  },
  {
    site: 'Facebook',
    url: 'https://www.facebook.com/',
    host: 'facebook.com',
    capabilities: 'Public videos and photo posts',
    auth: '',
    examples: [
      { label: 'Share', url: 'https://www.facebook.com/share/v/abc123/' },
    ],
  },
  {
    site: 'Reddit',
    url: 'https://www.reddit.com/',
    host: 'reddit.com',
    capabilities: 'Videos, GIFs, image galleries',
    auth: '',
    examples: [
      { label: 'Video post', url: 'https://www.reddit.com/r/aww/comments/abcdef/cute_dog/' },
    ],
  },
  {
    site: 'Bluesky',
    url: 'https://bsky.app/',
    host: 'bsky.app',
    capabilities: 'Videos, GIFs on posts',
    auth: '',
    examples: [
      { label: 'Post', url: 'https://bsky.app/profile/example.bsky.social/post/abc123' },
    ],
  },
  {
    site: 'Vimeo',
    url: 'https://vimeo.com/',
    host: 'vimeo.com',
    capabilities: 'Public videos',
    auth: '',
    examples: [
      { label: 'Video', url: 'https://vimeo.com/123456789' },
    ],
  },
  {
    site: 'Twitch',
    url: 'https://www.twitch.tv/',
    host: 'twitch.tv',
    capabilities: 'Clips (not VODs)',
    auth: '',
    examples: [
      { label: 'Clip', url: 'https://www.twitch.tv/streamer/clip/SomeClipSlug' },
      { label: 'Clip (short URL)', url: 'https://clips.twitch.tv/SomeClipSlug' },
    ],
  },
  {
    site: 'Bilibili',
    url: 'https://www.bilibili.com/',
    host: 'bilibili.com',
    capabilities: 'Videos',
    auth: '',
    examples: [
      { label: 'Video', url: 'https://www.bilibili.com/video/BV1xx411c7mD' },
    ],
  },
  {
    site: 'Streamable',
    url: 'https://streamable.com/',
    host: 'streamable.com',
    capabilities: 'Videos',
    auth: '',
    examples: [
      { label: 'Video', url: 'https://streamable.com/abcdef' },
    ],
  },
  {
    site: 'Loom',
    url: 'https://www.loom.com/',
    host: 'loom.com',
    capabilities: 'Public share videos',
    auth: '',
    examples: [
      { label: 'Share', url: 'https://www.loom.com/share/abc123def456' },
    ],
  },
  {
    site: 'Dailymotion',
    url: 'https://www.dailymotion.com/',
    host: 'dailymotion.com',
    capabilities: 'Videos',
    auth: '',
    examples: [
      { label: 'Video', url: 'https://www.dailymotion.com/video/x12345' },
    ],
  },
  {
    site: 'SoundCloud',
    url: 'https://soundcloud.com/',
    host: 'soundcloud.com',
    capabilities: 'Tracks, audio',
    auth: '',
    examples: [
      { label: 'Track', url: 'https://soundcloud.com/artist/track-slug' },
    ],
  },
  {
    site: 'Pinterest',
    url: 'https://www.pinterest.com/',
    host: 'pinterest.com',
    capabilities: 'Pins (image / video)',
    auth: '',
    examples: [
      { label: 'Pin', url: 'https://www.pinterest.com/pin/123456789012345/' },
    ],
  },
  {
    site: 'Tumblr',
    url: 'https://www.tumblr.com/',
    host: 'tumblr.com',
    capabilities: 'Video / GIF posts',
    auth: '',
    examples: [
      { label: 'Post', url: 'https://blog.tumblr.com/post/123456789' },
    ],
  },
  {
    site: 'Snapchat',
    url: 'https://www.snapchat.com/',
    host: 'snapchat.com',
    capabilities: 'Spotlight videos',
    auth: '',
    examples: [
      { label: 'Spotlight', url: 'https://www.snapchat.com/spotlight/abc123' },
    ],
  },
];
