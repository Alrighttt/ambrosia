import init, {
  AppKey,
  Builder,
} from '../vendor/sia-storage/sia_storage_wasm.js';
import { APP_META, DEFAULT_INDEXER_URL } from './constants.js';
import { fromHex, getStored } from './storage.js';

let wasmReady = null;
let sdkPromise = null;
let currentSdk = null;
let disposed = false;
const ACCOUNT_READY_TIMEOUT_MS = 90_000;
const ACCOUNT_READY_POLL_MS = 1_500;

export async function getSdk() {
  if (disposed) {
    disposed = false;
    sdkPromise = null;
    currentSdk = null;
  }
  if (!wasmReady) wasmReady = init();
  await wasmReady;
  if (!sdkPromise) sdkPromise = buildSdk();
  try {
    const sdk = await sdkPromise;
    if (!sdk) {
      sdkPromise = null;
      throw new Error('Ambrosia is not connected. Open setup and finish registration first.');
    }
    currentSdk = sdk;
    return sdk;
  } catch (err) {
    sdkPromise = null;
    currentSdk = null;
    throw err;
  }
}

export function invalidateSdk({ dispose = true } = {}) {
  if (dispose) disposeSdk('invalidate');
  sdkPromise = null;
  currentSdk = null;
}

export function disposeSdk(reason = 'pagehide') {
  disposed = true;
  const sdk = currentSdk;
  currentSdk = null;
  sdkPromise = null;
  if (!sdk || typeof sdk.dispose !== 'function') return 0;
  try {
    const closed = sdk.dispose();
    console.info(`[ambrosia] disposed Sia SDK (${reason}); closed ${closed} transport session(s)`);
    return closed;
  } catch (err) {
    console.warn('[ambrosia] Sia SDK dispose failed:', err);
    return 0;
  }
}

async function buildSdk() {
  const { appKey, indexerUrl } = await getStored();
  if (!appKey) return null;
  const url = indexerUrl || DEFAULT_INDEXER_URL;
  const key = new AppKey(fromHex(appKey));
  const builder = new Builder(url, APP_META);
  const sdk = await builder.connected(key);
  if (!sdk) return null;
  currentSdk = sdk;
  try {
    await waitForAccountReady(sdk);
  } catch (err) {
    disposeSdk('account-ready-failed');
    throw err;
  }
  return sdk;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function accountReady(account) {
  return account?.ready === true
    || account?.isReady === true
    || account?.is_ready === true;
}

async function waitForAccountReady(sdk) {
  const started = Date.now();
  let lastAccount = null;
  while (Date.now() - started < ACCOUNT_READY_TIMEOUT_MS) {
    lastAccount = await sdk.account();
    if (accountReady(lastAccount)) return lastAccount;
    await sleep(ACCOUNT_READY_POLL_MS);
  }
  const state = lastAccount ? `ready=${String(lastAccount.ready)}` : 'no account response';
  throw new Error(`Sia account is not ready yet (${state}). Try again in a moment.`);
}
