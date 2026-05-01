const KEY = 'ambrosia.archives';

const SHARE_VALIDITY_MS = 100 * 365 * 24 * 60 * 60 * 1000;

export async function listArchives() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export async function addArchive(entry) {
  const archives = await listArchives();
  const record = {
    id: crypto.randomUUID(),
    archivedAt: new Date().toISOString(),
    ...entry,
  };
  archives.unshift(record);
  localStorage.setItem(KEY, JSON.stringify(archives));
  return record;
}

export async function removeArchive(id) {
  const archives = await listArchives();
  localStorage.setItem(KEY, JSON.stringify(archives.filter((a) => a.id !== id)));
}

export async function replaceArchives(records) {
  localStorage.setItem(KEY, JSON.stringify(records));
}

// Reconstruct the library by walking every PinnedObject the user owns,
// reading the JSON metadata blob attached at upload time, and grouping
// related objects together. Two cooperating mechanisms:
//   1. `sourceUrl` groups objects from the same post (media, audio,
//      thumbnail, etc. all share this field).
//   2. `refs.thumbnail` (schema v3+) is a direct objectId pointer from
//      every media object to its thumbnail. Deterministic, no search.
// Older schema-1/2 entries fall back to the role-based grouping path.
export async function syncLibraryFromSia(sdk, { onProgress } = {}) {
  const validUntil = new Date(Date.now() + SHARE_VALIDITY_MS);

  // Pull every object event in chunks. The SDK paginates; pass undefined
  // cursor to get the newest page, then walk back via `after` cursor.
  const events = [];
  let cursor;
  for (let page = 0; page < 50; page++) {
    const batch = await sdk.objectEvents(cursor, 100);
    if (!batch || batch.length === 0) break;
    events.push(...batch);
    onProgress?.(events.length);
    if (batch.length < 100) break;
    const last = batch[batch.length - 1];
    if (!last) break;
    // ObjectEvent's relevant fields are `id` (string getter) and
    // `updatedAt` (Date getter). `last.timestamp` was a leftover
    // from an older SDK shape and resolved to undefined → cursor.after
    // became Invalid Date → indexer returned the same window forever
    // → sync would chew through 5000 objects without making progress.
    // Fall back to `timestamp` for backwards compat with whatever
    // older binding may have used it.
    const lastId = typeof last.id === 'function' ? last.id() : last.id;
    const rawAfter = last.updatedAt
      ?? (typeof last.timestamp === 'function' ? last.timestamp() : last.timestamp);
    const lastAfter = rawAfter instanceof Date ? rawAfter : new Date(rawAfter);
    if (Number.isNaN(lastAfter.getTime())) {
      console.warn('[ambrosia] sync: cursor advance failed — no usable timestamp on last event', last);
      break;
    }
    cursor = { id: lastId, after: lastAfter };
  }

  // First pass: index every live object by its objectId so refs.thumbnail
  // lookups are O(1). Also extract metadata once per object — JSON-parsing
  // an Uint8Array isn't free.
  const byId = new Map();
  for (const ev of events) {
    if (!ev || ev.deleted || !ev.object) continue;
    let meta;
    try {
      meta = JSON.parse(new TextDecoder().decode(ev.object.metadata()));
    } catch { continue; }
    if (!meta?.sourceUrl) continue;
    const id = typeof ev.object.id === 'function' ? ev.object.id() : ev.object.id;
    if (!id) continue;
    byId.set(id, { object: ev.object, meta });
  }

  // Second pass: group by sourceUrl, building each archive entry. Within
  // a group, prefer `refs.thumbnail` for thumbnail resolution over the
  // role-based fallback so a deleted-then-re-uploaded thumbnail doesn't
  // confuse the wiring.
  const groups = new Map();
  for (const { object, meta } of byId.values()) {
    const sourceUrl = meta.sourceUrl;
    let group = groups.get(sourceUrl);
    if (!group) {
      group = {
        sourceUrl,
        thumbnailSiaUrl: null,
        thumbnailObjectId: null,
        files: [],
        firstSeenAt: meta.archivedAt || new Date().toISOString(),
        platform: meta.platform || null,
        title: meta.title || null,
        itemCount: meta.itemCount || null,
        pageTitle: meta.pageTitle || null,
        caption: meta.caption || null,
        author: meta.author || null,
        siteName: meta.siteName || null,
        threadScore: meta.ext?.threadScore ?? null,
        threadCommentCount: meta.ext?.threadCommentCount ?? null,
        threadCreatedUtc: meta.ext?.threadCreatedUtc ?? null,
      };
      groups.set(sourceUrl, group);
    } else {
      // Page-meta fields can land on any of the per-source objects; first
      // non-null wins so we don't lose them across thumbnail/media records.
      group.pageTitle ||= meta.pageTitle || null;
      group.caption ||= meta.caption || null;
      group.author ||= meta.author || null;
      group.siteName ||= meta.siteName || null;
      group.threadScore ??= meta.ext?.threadScore ?? null;
      group.threadCommentCount ??= meta.ext?.threadCommentCount ?? null;
      group.threadCreatedUtc ??= meta.ext?.threadCreatedUtc ?? null;
    }

    // Schema v3+: pointer to thumbnail by objectId. Resolve it eagerly.
    const thumbId = meta.refs?.thumbnail;
    if (thumbId && !group.thumbnailObjectId) {
      const target = byId.get(thumbId);
      if (target) {
        try {
          group.thumbnailSiaUrl = sdk.shareObject(target.object, validUntil);
          group.thumbnailObjectId = thumbId;
        } catch (err) {
          console.warn('[ambrosia] could not mint share URL for thumbnail target', err);
        }
      }
    }

    let siaUrl;
    try {
      siaUrl = sdk.shareObject(object, validUntil);
    } catch (err) {
      console.warn('[ambrosia] could not mint share URL for object', err);
      continue;
    }
    if (meta.role === 'thumbnail') {
      // Fallback path for older schemas (or if the refs lookup above
      // didn't fire because the media object hasn't been seen yet).
      if (!group.thumbnailSiaUrl) {
        group.thumbnailSiaUrl = siaUrl;
        group.thumbnailObjectId = object.id?.() || object.id || null;
      }
    } else {
      group.files.push({
        role: meta.role || 'media',
        siaUrl,
        mimeType: meta.type || null,
        sizeBytes: meta.size || null,
        filename: meta.name || null,
        roleIndex: typeof meta.roleIndex === 'number' ? meta.roleIndex : null,
      });
    }
    if (meta.archivedAt && meta.archivedAt < group.firstSeenAt) {
      group.firstSeenAt = meta.archivedAt;
    }
  }

  // Convert each group to an archive entry. Drop groups with no media.
  const archives = [];
  for (const group of groups.values()) {
    if (group.files.length === 0) continue;
    group.files.sort((a, b) => {
      if (a.roleIndex != null && b.roleIndex != null) return a.roleIndex - b.roleIndex;
      return (a.filename || '').localeCompare(b.filename || '');
    });
    const audio = group.files.find((f) => f.role === 'audio');
    // Pull out the thread JSON object (if any) so it doesn't appear in
    // the carousel's media list. A thread-only archive (no media files)
    // becomes type='thread' so the library tile uses the Reddit post
    // card; mixed media+thread archives keep their primary media type.
    const threadFile = group.files.find((f) => f.role === 'thread');
    const mediaFiles = group.files.filter((f) => f.role !== 'thread');
    const primary = mediaFiles.find((f) => f.role !== 'audio') || mediaFiles[0];
    let type;
    if (mediaFiles.length === 0 && threadFile) {
      type = 'thread';
    } else if (mediaFiles[0]?.role === 'photo') {
      type = 'photo';
    } else if (mediaFiles.length > 1) {
      type = 'collection';
    } else {
      type = 'video';
    }
    archives.push({
      id: crypto.randomUUID(),
      type,
      platform: group.platform,
      sourceUrl: group.sourceUrl,
      title: group.pageTitle || group.title,
      pageTitle: group.pageTitle,
      caption: group.caption,
      author: group.author,
      siteName: group.siteName,
      itemCount: group.itemCount || mediaFiles.length || 1,
      thumbnailUrl: null,
      thumbnailSiaUrl: group.thumbnailSiaUrl,
      thumbnailObjectId: group.thumbnailObjectId,
      siaUrl: primary?.siaUrl || threadFile?.siaUrl || null,
      mimeType: primary?.mimeType || (threadFile ? 'application/json' : null),
      sizeBytes: primary?.sizeBytes || threadFile?.sizeBytes || null,
      audioSiaUrl: audio?.siaUrl || null,
      hasThread: !!threadFile,
      threadSiaUrl: threadFile?.siaUrl || null,
      threadScore: group.threadScore ?? null,
      threadCommentCount: group.threadCommentCount ?? null,
      threadCreatedUtc: group.threadCreatedUtc ?? null,
      files: group.files,
      archivedAt: group.firstSeenAt,
    });
  }

  archives.sort((a, b) => (b.archivedAt || '').localeCompare(a.archivedAt || ''));
  return archives;
}
