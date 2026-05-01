// Pyodide + gallery-dl runner. Loads on-demand the first time a
// gallery-dl extraction is requested (~5-10s cold-start, <1s warm).
// Subsequent requests reuse the loaded interpreter.
//
// Networking: gallery-dl's Python `requests` calls are patched by
// pyodide-http to go through the browser's fetch. Because we're
// running in an extension background context with <all_urls>
// host_permissions, the requests automatically inherit the user's
// session cookies for whichever site gallery-dl targets — no manual
// cookie injection needed for the common case.

// Pyodide is bundled locally in the extension (firefox-extension/pyodide/)
// rather than loaded from a CDN. Firefox MV3 rejects cross-origin
// dynamic-import for ESM modules in extension background scripts even
// with CSP allowing it; loading from the extension's own moz-extension://
// origin sidesteps that. See INSTALL.md for what's in the bundle.
const PYODIDE_INDEX = (typeof browser !== 'undefined' ? browser : chrome)
  .runtime.getURL('pyodide/');

let pyodidePromise = null;
let bootStatus = { state: 'idle', step: '' };

export function getGalleryDlStatus() {
  return { ...bootStatus };
}

async function ensurePyodide() {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    bootStatus = { state: 'booting', step: 'loading pyodide runtime' };
    const { loadPyodide } = await import(PYODIDE_INDEX + 'pyodide.mjs');

    const py = await loadPyodide({
      indexURL: PYODIDE_INDEX,
      stdout: (s) => console.log('[gallery-dl py]', s),
      stderr: (s) => console.warn('[gallery-dl py-err]', s),
    });

    bootStatus = { state: 'booting', step: 'loading python stdlib (requests, ssl)' };
    // ssl is unvendored from Pyodide's default stdlib; gallery-dl's
    // common.py imports it eagerly, so we have to load it explicitly.
    await py.loadPackage(['micropip', 'requests', 'ssl']);

    bootStatus = { state: 'booting', step: 'installing gallery-dl' };
    await py.runPythonAsync(`
import micropip
await micropip.install(['pyodide-http', 'gallery-dl'])
import pyodide_http
pyodide_http.patch_all()
print('[gallery-dl] runtime ready')
    `);

    bootStatus = { state: 'ready', step: '' };
    return py;
  })().catch((err) => {
    bootStatus = { state: 'failed', step: err.message || String(err) };
    pyodidePromise = null; // allow retry
    throw err;
  });
  return pyodidePromise;
}

// Extract media items from a URL via gallery-dl. Returns null if no
// gallery-dl extractor matches (caller falls back to Cobalt). Throws
// on actual extraction errors so caller can decide whether to retry
// or fall through.
// Public fallback Imgur Client-ID. gallery-dl's own default Client-ID
// is shared by every gallery-dl user globally and is perpetually
// rate-limited or revoked, returning 200-OK with empty data arrays
// (which gallery-dl translates into "matched but zero items" — the
// failure mode users report most). Shipping a different lineage's
// public Client-ID gives Ambrosia its own rate quota separate from the
// gallery-dl shared pool. This isn't a final solution — under heavy use
// this will eventually hit limits too — but it's enough to make the
// imgur path work out of the box for hackathon-scale archive volume.
// Users can override by setting `imgurClientId` in extension storage.
const DEFAULT_IMGUR_CLIENT_ID = 'c25b40c3f6b62fa';

export async function extractWithGalleryDl(url, opts = {}) {
  if (!url) throw new Error('no url');

  const py = await ensurePyodide();
  py.globals.set('target_url', url);
  py.globals.set('pixiv_refresh_token', opts.pixivRefreshToken || '');
  py.globals.set('imgur_client_id', opts.imgurClientId || DEFAULT_IMGUR_CLIENT_ID);

  await py.runPythonAsync(`
import json
from gallery_dl import config, extractor, exception
from gallery_dl.extractor.message import Message

result = {'matched': False, 'items': [], 'meta': {}}

if pixiv_refresh_token:
    config.set(("extractor", "pixiv"), "refresh-token", pixiv_refresh_token)
    config.set(("extractor", "pixiv-novel"), "refresh-token", pixiv_refresh_token)

if imgur_client_id:
    config.set(("extractor", "imgur"), "client-id", imgur_client_id)

try:
    ext = extractor.find(target_url)
except Exception as e:
    result['error'] = f'extractor.find failed: {e}'
    ext = None

if ext is not None:
    result['matched'] = True
    result['category'] = ext.category
    result['subcategory'] = ext.subcategory

    # Walk the extractor. gallery-dl yields tagged messages:
    #   (Message.Version, version)
    #   (Message.Directory, kwdict)
    #   (Message.Url, url, kwdict)
    # We only care about Url messages — those are the actual media.
    try:
        count = 0
        for msg in ext:
            count += 1
            if count > 200:
                result['truncated'] = True
                break
            if not isinstance(msg, tuple):
                continue
            if msg[0] == Message.Url:
                item_url = msg[1]
                kwdict = dict(msg[2]) if len(msg) > 2 and msg[2] else {}
                item = {
                    'url': item_url,
                    'filename': kwdict.get('filename') or '',
                    'extension': kwdict.get('extension') or '',
                    'num': kwdict.get('num'),
                    'count': kwdict.get('count'),
                    'title': kwdict.get('title') or kwdict.get('description'),
                    'author': kwdict.get('author') or kwdict.get('user') or kwdict.get('uploader'),
                }
                item = {k: v for k, v in item.items() if v not in (None, '')}
                result['items'].append(item)
        result['meta']['total'] = count
    except exception.AuthenticationError as e:
        result['error'] = f'authentication required: {e}'
    except exception.AuthorizationError as e:
        result['error'] = f'authorization failed: {e}'
    except exception.NotFoundError as e:
        result['error'] = f'not found: {e}'
    except exception.GalleryDLException as e:
        result['error'] = f'gallery-dl error: {e}'
    except Exception as e:
        result['error'] = f'unexpected: {type(e).__name__}: {e}'

# Stash the JSON in a global so the JS side reads it unambiguously,
# regardless of whether the script's last expression evaluated to None.
result_json_out = json.dumps(result)
  `);

  const resultJson = py.globals.get('result_json_out');
  return JSON.parse(resultJson);
}
