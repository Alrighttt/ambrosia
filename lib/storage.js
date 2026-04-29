const KEY_APP = 'appKey';
const KEY_INDEXER = 'indexerUrl';

export async function getStored() {
  const out = await chrome.storage.local.get([KEY_APP, KEY_INDEXER]);
  return {
    appKey: out[KEY_APP] || null,
    indexerUrl: out[KEY_INDEXER] || null,
  };
}

export async function setAppKey(hex) {
  await chrome.storage.local.set({ [KEY_APP]: hex });
}

export async function clearAppKey() {
  await chrome.storage.local.remove([KEY_APP]);
}

export async function setIndexerUrl(url) {
  await chrome.storage.local.set({ [KEY_INDEXER]: url });
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
