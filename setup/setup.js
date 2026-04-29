import init, {
  AppKey,
  Builder,
  generateRecoveryPhrase,
} from '../vendor/sia-storage/sia_storage_wasm.js';
import { APP_META, DEFAULT_INDEXER_URL } from '../lib/constants.js';
import {
  fromHex,
  getStored,
  normalizeIndexerUrl,
  setAppKey,
  setIndexerUrl,
  toHex,
} from '../lib/storage.js';

let builder = null;
const wasmReady = init();

const $ = (id) => document.getElementById(id);

function show(name) {
  document.querySelectorAll('.step').forEach((el) => {
    el.classList.toggle('hidden', el.dataset.step !== name);
  });
}

function setStatus(el, text, kind) {
  el.textContent = text;
  el.className = 'status ' + (kind || '');
}

async function bootstrap() {
  const stored = await getStored();
  $('indexer-url').value = stored.indexerUrl || DEFAULT_INDEXER_URL;
  await wasmReady;
}

document.querySelectorAll('button.back').forEach((btn) => {
  btn.addEventListener('click', () => show(btn.dataset.back));
});

$('indexer-continue').addEventListener('click', async () => {
  const url = normalizeIndexerUrl($('indexer-url').value) || DEFAULT_INDEXER_URL;
  $('indexer-url').value = url;
  await setIndexerUrl(url);
  show('choose');
});

$('path-register').addEventListener('click', async () => {
  await wasmReady;
  const url = normalizeIndexerUrl($('indexer-url').value) || DEFAULT_INDEXER_URL;
  const btn = $('path-register');
  btn.disabled = true;
  try {
    builder = new Builder(url, APP_META);
    await builder.requestConnection();
    const responseUrl = builder.responseUrl();
    const link = $('approval-link');
    link.href = responseUrl;
    link.textContent = responseUrl;
    show('approve');
  } catch (err) {
    alert('Failed to request connection: ' + (err.message || String(err)));
  } finally {
    btn.disabled = false;
  }
});

$('path-restore').addEventListener('click', () => {
  $('restore-key').value = '';
  setStatus($('restore-status'), '', '');
  show('restore');
});

$('approve-check').addEventListener('click', async () => {
  await wasmReady;
  const status = $('approve-status');
  if (!builder) {
    setStatus(status, 'Go back and request connection again.', 'fail');
    return;
  }
  const btn = $('approve-check');
  btn.disabled = true;
  setStatus(status, 'Polling for approval…', '');
  try {
    await builder.waitForApproval();
    setStatus(status, 'Approved!', 'pass');
    show('recover');
  } catch (err) {
    setStatus(status, 'Error: ' + (err.message || String(err)), 'fail');
  } finally {
    btn.disabled = false;
  }
});

$('recovery-generate').addEventListener('click', async () => {
  await wasmReady;
  $('recovery-phrase').value = generateRecoveryPhrase();
});

$('recovery-register').addEventListener('click', async () => {
  await wasmReady;
  const status = $('recover-status');
  if (!builder) {
    setStatus(status, 'Restart the flow.', 'fail');
    return;
  }
  const phrase = $('recovery-phrase').value.trim().replace(/\s+/g, ' ');
  if (!phrase) {
    setStatus(status, 'Generate or paste a 12-word phrase.', 'fail');
    return;
  }
  const btn = $('recovery-register');
  btn.disabled = true;
  setStatus(status, 'Registering…', '');
  try {
    const sdk = await builder.register(phrase);
    const seed = sdk.appKey().export();
    const hex = toHex(seed);
    await setAppKey(hex);
    builder = null;
    $('done-phrase').textContent = phrase;
    $('done-key').textContent = hex;
    show('done');
  } catch (err) {
    setStatus(status, 'Error: ' + (err.message || String(err)), 'fail');
    btn.disabled = false;
  }
});

$('restore-save').addEventListener('click', async () => {
  await wasmReady;
  const status = $('restore-status');
  setStatus(status, '', '');
  const url = normalizeIndexerUrl($('indexer-url').value) || DEFAULT_INDEXER_URL;
  let bytes;
  try {
    bytes = fromHex($('restore-key').value);
    if (bytes.length !== 32) throw new Error('expected 32 bytes (64 hex chars)');
  } catch (err) {
    setStatus(status, 'Invalid app key: ' + err.message, 'fail');
    return;
  }
  const btn = $('restore-save');
  btn.disabled = true;
  setStatus(status, 'Validating with indexer…', '');
  try {
    const appKey = new AppKey(bytes);
    const probe = new Builder(url, APP_META);
    const sdk = await probe.connected(appKey);
    if (!sdk) {
      setStatus(status, 'This app key is not registered with the indexer (or was revoked).', 'fail');
      btn.disabled = false;
      return;
    }
    const hex = toHex(bytes);
    await setAppKey(hex);
    $('done-phrase').textContent = '(restored — phrase not shown)';
    $('done-key').textContent = hex;
    show('done');
  } catch (err) {
    setStatus(status, 'Error: ' + (err.message || String(err)), 'fail');
    btn.disabled = false;
  }
});

$('done-close').addEventListener('click', () => {
  $('done-phrase').textContent = '';
  $('done-key').textContent = '';
  $('recovery-phrase').value = '';
  $('restore-key').value = '';
  window.close();
});

bootstrap();
