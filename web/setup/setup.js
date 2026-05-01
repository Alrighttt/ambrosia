import init, {
  Builder,
  generateRecoveryPhrase,
} from '../vendor/sia-storage/sia_storage_wasm.js';
import { APP_META, DEFAULT_INDEXER_URL } from '../lib/constants.js';
import {
  getStored,
  normalizeIndexerUrl,
  setAppKey,
  setIndexerUrl,
  toHex,
} from '../lib/storage.js';

let builder = null;
const wasmReady = init();
const ACCOUNT_READY_TIMEOUT_MS = 90_000;
const ACCOUNT_READY_POLL_MS = 1_500;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function accountReady(account) {
  // Current SDK bindings expose Account.ready. Keep the fallback keys
  // here so setup keeps behaving if the wasm-bindgen shape changes to
  // match Rust naming more directly.
  return account?.ready === true
    || account?.isReady === true
    || account?.is_ready === true;
}

async function waitForAccountReady(sdk, onPoll) {
  const started = Date.now();
  let lastAccount = null;
  while (Date.now() - started < ACCOUNT_READY_TIMEOUT_MS) {
    lastAccount = await sdk.account();
    if (accountReady(lastAccount)) return lastAccount;
    const elapsed = Math.round((Date.now() - started) / 1000);
    onPoll?.(lastAccount, elapsed);
    await sleep(ACCOUNT_READY_POLL_MS);
  }
  const state = lastAccount ? `ready=${String(lastAccount.ready)}` : 'no account response';
  throw new Error(`Sia account is not ready yet (${state}). Wait a moment and continue again.`);
}

async function bootstrap() {
  const stored = await getStored();
  $('indexer-url').value = stored.indexerUrl || DEFAULT_INDEXER_URL;
  await wasmReady;
}

document.querySelectorAll('button.back').forEach((btn) => {
  btn.addEventListener('click', () => show(btn.dataset.back));
});

// Step 1 → 2: save the indexer URL and request a connection. Hitting the
// "Continue" on the indexer step starts the approval flow directly — same
// path for both new users and returning users with an existing recovery
// phrase. If they reuse a previously-registered phrase later in step 3,
// the SDK reconstructs the same AppKey and reconnects to the same archive.
$('indexer-continue').addEventListener('click', async () => {
  await wasmReady;
  const url = normalizeIndexerUrl($('indexer-url').value) || DEFAULT_INDEXER_URL;
  $('indexer-url').value = url;
  await setIndexerUrl(url);

  const btn = $('indexer-continue');
  btn.disabled = true;
  try {
    builder = new Builder(url, APP_META);
    await builder.requestConnection();
    const responseUrl = builder.responseUrl();
    const link = $('approval-link');
    link.href = responseUrl;
    link.textContent = responseUrl;
    show('approve');
    // Open the approval URL automatically. The click came from a user
    // gesture (the Continue button), so the popup-blocker should let
    // window.open through. If anything blocks it (some mobile Safari
    // setups, strict popup-blocker extensions), the user still has the
    // visible link to fall back to — we don't error on a blocked open.
    let popupOpened = true;
    try {
      const popup = window.open(responseUrl, '_blank', 'noopener');
      if (!popup) {
        popupOpened = false;
        setStatus($('approve-status'), 'Popup blocked — open the link below to approve.', '');
      }
    } catch (_) { popupOpened = false; }

    // Start polling for approval immediately. The user's expected flow:
    // they're redirected to the indexer, sign in, click Approve, get
    // bounced back. By then our waitForApproval() has already resolved
    // and we've advanced to the recovery step automatically — no need
    // for them to click "I approved" themselves. The button stays
    // available as a manual retry in case the auto-poll errors out.
    autoWatchForApproval(popupOpened);
  } catch (err) {
    alert('Failed to request connection: ' + (err.message || String(err)));
  } finally {
    btn.disabled = false;
  }
});

// Tracks the in-flight waitForApproval call so we don't double-fire it
// when the user manually clicks the fallback button.
let approvalWatch = null;

async function autoWatchForApproval(popupOpened) {
  if (approvalWatch) return; // already polling
  if (!builder) return;
  const status = $('approve-status');
  setStatus(status, popupOpened ? 'Waiting for approval…' : 'Open the link, sign in, and click Approve.', '');
  approvalWatch = (async () => {
    try {
      await builder.waitForApproval();
      setStatus(status, 'Approved!', 'pass');
      show('recover');
    } catch (err) {
      setStatus(status, 'Error: ' + (err.message || String(err)), 'fail');
    } finally {
      approvalWatch = null;
    }
  })();
}

$('approve-check').addEventListener('click', () => {
  // Manual retry — fires only if auto-poll isn't already running.
  if (!builder) {
    setStatus($('approve-status'), 'Go back and request connection again.', 'fail');
    return;
  }
  autoWatchForApproval(true);
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
    setStatus(status, 'Generate a phrase or paste an existing one.', 'fail');
    return;
  }
  const btn = $('recovery-register');
  btn.disabled = true;
  setStatus(status, 'Connecting…', '');
  try {
    // register() is idempotent on the indexer side: if this phrase derives
    // to an AppKey that's already registered, the SDK returns the same Sdk
    // and the user lands on their existing archive. New phrase → new
    // account.
    const sdk = await builder.register(phrase);
    setStatus(status, 'Preparing Sia account…', '');
    await waitForAccountReady(sdk, (_account, elapsed) => {
      setStatus(status, `Preparing Sia account… ${elapsed}s`, '');
    });
    const seed = sdk.appKey().export();
    await setAppKey(toHex(seed));
    builder = null;
    $('done-phrase').textContent = phrase;
    show('done');
  } catch (err) {
    setStatus(status, 'Error: ' + (err.message || String(err)), 'fail');
    btn.disabled = false;
  }
});

$('done-close').addEventListener('click', () => {
  $('done-phrase').textContent = '';
  $('recovery-phrase').value = '';
  window.location.href = '../index.html';
});

bootstrap();
