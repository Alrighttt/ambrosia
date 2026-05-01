const KEY_APP = 'ambrosia.appKey';
const KEY_INDEXER = 'ambrosia.indexerUrl';
const KEY_COBALT = 'ambrosia.cobaltUrl';

export async function getStored() {
  return {
    appKey: localStorage.getItem(KEY_APP),
    indexerUrl: localStorage.getItem(KEY_INDEXER),
    cobaltUrl: localStorage.getItem(KEY_COBALT),
  };
}

export async function setAppKey(hex) {
  localStorage.setItem(KEY_APP, hex);
}

export async function clearAppKey() {
  localStorage.removeItem(KEY_APP);
}

export async function setIndexerUrl(url) {
  localStorage.setItem(KEY_INDEXER, url);
}

export async function setCobaltUrl(url) {
  localStorage.setItem(KEY_COBALT, url);
}

// Wipe everything Ambrosia put in localStorage — appKey, archives, indexer
// URL, Cobalt URL, and any future keys we add. Used by the "Reset app"
// footer link to return to a first-visit state.
export function clearAll() {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('ambrosia.')) toRemove.push(key);
  }
  for (const key of toRemove) localStorage.removeItem(key);
}

export function toHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex) {
  if (typeof hex !== 'string') throw new Error('hex must be a string');
  const clean = hex.trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]+$/.test(clean)) throw new Error('not a hex string');
  if (clean.length % 2 !== 0) throw new Error('odd-length hex');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

export function normalizeIndexerUrl(url) {
  let u = (url || '').trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u.replace(/\/+$/, '');
}
