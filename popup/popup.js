import { getStored } from '../lib/storage.js';

const setupCard = document.getElementById('setup-card');
const openSetupBtn = document.getElementById('open-setup');

const pageCard = document.getElementById('page-card');
const titleEl = document.getElementById('page-title');
const urlEl = document.getElementById('page-url');

const videoCard = document.getElementById('video-card');
const videoTitleEl = document.getElementById('video-title');
const videoAuthorEl = document.getElementById('video-author');
const videoLengthEl = document.getElementById('video-length');
const videoFormatEl = document.getElementById('video-format');
const videoQualityEl = document.getElementById('video-quality');
const videoSizeEl = document.getElementById('video-size');

const pageActions = document.getElementById('page-actions');
const pageBtn = document.getElementById('archive-page');
const videoBtn = document.getElementById('archive-video');
const resultEl = document.getElementById('result');

let currentTabId = null;
let videoAvailable = false;

openSetupBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

async function init() {
  const stored = await getStored();
  if (!stored.appKey) {
    setupCard.classList.remove('hidden');
    return;
  }

  pageCard.classList.remove('hidden');
  pageActions.classList.remove('hidden');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:\/\//.test(tab.url)) {
    titleEl.textContent = 'Open a webpage to archive it.';
    pageBtn.disabled = true;
    return;
  }
  currentTabId = tab.id;
  titleEl.textContent = tab.title || tab.url;
  urlEl.textContent = tab.url;
  try {
    const status = await chrome.runtime.sendMessage({ type: 'ambrosia/get-status', tabId: tab.id });
    if (status?.video) renderVideo(status.video);
  } catch (_) {}
}

function renderVideo({ site, summary, preview }) {
  videoAvailable = true;
  videoCard.classList.remove('hidden');
  videoTitleEl.textContent = summary?.title || summary?.videoId || '(unknown)';
  videoAuthorEl.textContent = [site, summary?.author].filter(Boolean).join(' · ');
  videoLengthEl.textContent = summary?.duration ? formatDuration(summary.duration) : 'unknown';

  if (preview) {
    videoFormatEl.textContent = formatLabel(preview);
    videoQualityEl.textContent = qualityLabel(preview);
    videoSizeEl.textContent = preview.sizeBytes ? formatSize(preview.sizeBytes) : 'unknown';
  } else {
    videoFormatEl.textContent = 'unknown';
    videoQualityEl.textContent = 'unknown';
    videoSizeEl.textContent = 'unknown';
  }
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

function formatSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return 'unknown';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' GB';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' MB';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' KB';
  return n + ' B';
}

function formatLabel(p) {
  const container = (p.container || '').toUpperCase();
  if (!container) return p.mimeType || 'unknown';
  const codecs = (p.codecs || '').split(',')[0]?.trim();
  const codecLabel = friendlyCodec(codecs);
  return codecLabel ? `${container} · ${codecLabel}` : container;
}

function friendlyCodec(codec) {
  if (!codec) return '';
  if (codec.startsWith('avc1')) return 'H.264';
  if (codec.startsWith('hvc1') || codec.startsWith('hev1')) return 'H.265';
  if (codec.startsWith('vp09')) return 'VP9';
  if (codec.startsWith('av01')) return 'AV1';
  if (codec.startsWith('mp4a')) return 'AAC';
  if (codec.startsWith('opus')) return 'Opus';
  return codec;
}

function qualityLabel(p) {
  if (p.qualityLabel) {
    const fps = p.fps && p.fps !== 30 ? ` · ${p.fps}fps` : '';
    return p.qualityLabel + fps;
  }
  if (p.width && p.height) return `${p.width}×${p.height}`;
  return 'unknown';
}

async function runArchive(messageType, button, idleLabel, busyLabel, doneLabel) {
  pageBtn.disabled = true;
  videoBtn.disabled = true;
  button.textContent = busyLabel;
  resultEl.classList.add('hidden');
  try {
    const resp = await chrome.runtime.sendMessage({ type: messageType, tabId: currentTabId });
    if (!resp?.ok) throw new Error(resp?.error || 'archive failed');
    resultEl.classList.remove('hidden');
    resultEl.textContent = JSON.stringify(resp.result, null, 2);
    button.textContent = doneLabel;
  } catch (err) {
    resultEl.classList.remove('hidden');
    resultEl.textContent = 'Error: ' + (err.message || String(err));
    button.textContent = idleLabel;
  } finally {
    pageBtn.disabled = false;
    videoBtn.disabled = !videoAvailable;
  }
}

pageBtn.addEventListener('click', () =>
  runArchive('ambrosia/archive-page', pageBtn, 'Archive whole page', 'Archiving page…', 'Page archived'));
videoBtn.addEventListener('click', () =>
  runArchive('ambrosia/archive-video', videoBtn, 'Save video', 'Saving video…', 'Saved'));

init();
