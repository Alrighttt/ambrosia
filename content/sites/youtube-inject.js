(() => {
  const send = (payload) => {
    window.postMessage({ type: 'ambrosia/page-player-response', payload }, '*');
  };

  const extract = (resp) => {
    if (!resp || typeof resp !== 'object') return null;
    const details = resp.videoDetails || {};
    const streaming = resp.streamingData || {};
    return {
      videoId: details.videoId,
      title: details.title,
      author: details.author,
      duration: Number(details.lengthSeconds) || null,
      formats: streaming.formats || [],
      adaptiveFormats: streaming.adaptiveFormats || [],
    };
  };

  const trySend = () => {
    const data = extract(window.ytInitialPlayerResponse);
    if (data?.videoId) send(data);
  };

  trySend();

  let current = window.ytInitialPlayerResponse;
  Object.defineProperty(window, 'ytInitialPlayerResponse', {
    configurable: true,
    get() { return current; },
    set(v) { current = v; try { trySend(); } catch (_) {} },
  });

  document.addEventListener('yt-navigate-finish', trySend);
})();
