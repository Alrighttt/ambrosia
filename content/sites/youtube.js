(globalThis.__ambrosiaAdapters__ ||= []).push({
  name: 'youtube',
  match: () => /(?:^|\.)youtube\.com$/.test(location.hostname),

  init() {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('content/sites/youtube-inject.js');
    s.async = false;
    (document.head || document.documentElement).appendChild(s);
    s.remove();

    window.addEventListener('message', (e) => {
      if (e.source !== window) return;
      const d = e.data;
      if (!d || d.type !== 'ambrosia/page-player-response') return;
      this._data = d.payload;
      const info = this.getInfo();
      const stream = this.pickStream(info);
      const preview = this.buildPreview(stream);
      chrome.runtime.sendMessage({
        type: 'ambrosia/video-detected',
        site: 'youtube',
        summary: {
          videoId: info.videoId,
          title: info.title,
          author: info.author,
          duration: info.duration,
        },
        preview,
      });
    });
  },

  getInfo() {
    if (!this._data) return null;
    const d = this._data;
    return {
      site: 'youtube',
      videoId: d.videoId,
      title: d.title,
      author: d.author,
      duration: d.duration,
      formats: d.formats,
      adaptiveFormats: d.adaptiveFormats,
    };
  },

  pickStream(info) {
    if (!info) return null;
    const formats = [...(info.formats || []), ...(info.adaptiveFormats || [])];
    const progressive = formats.filter((f) => f.url && /video\/mp4/i.test(f.mimeType || ''));
    if (progressive.length === 0) return null;
    progressive.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    return progressive[0];
  },

  buildPreview(stream) {
    if (!stream) return null;
    const mimeType = (stream.mimeType || '').split(';')[0].trim();
    const codecMatch = (stream.mimeType || '').match(/codecs="([^"]+)"/);
    const container = (mimeType.split('/')[1] || '').toLowerCase();
    return {
      qualityLabel: stream.qualityLabel || (stream.height ? stream.height + 'p' : null),
      width: stream.width || null,
      height: stream.height || null,
      fps: stream.fps || null,
      container,
      mimeType,
      codecs: codecMatch ? codecMatch[1] : null,
      sizeBytes: stream.contentLength ? Number(stream.contentLength) : null,
      bitrate: stream.bitrate || null,
    };
  },
});
