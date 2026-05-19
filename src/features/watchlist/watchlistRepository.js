import { getDB } from '../../db/database';
import {
  WatchlistEntryInputSchema,
  WatchlistEntrySchema,
} from './watchlistSchema';

const STORE_NAME = 'watchlist';

export async function getAllEntries() {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const entries = await store.getAll();
  await tx.done;
  return entries.filter((entry) => !entry.deleted);
}

export async function getEntry(movieId) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const entry = await store.get(movieId);
  await tx.done;
  return entry || null;
}

export async function addEntry({ id, title, poster }) {
  const parsed = WatchlistEntryInputSchema.parse({ id, title, poster });
  const entry = WatchlistEntrySchema.parse({
    ...parsed,
    addedAt: Date.now(),
    updatedAt: Date.now(),
    synced: false,
    deleted: false,
  });

  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.put(entry);
  await tx.done;
  return entry;
}

export async function removeEntry(movieId) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const existing = await store.get(movieId);
  if (!existing) {
    await tx.done;
    return null;
  }

  const updated = {
    ...existing,
    deleted: true,
    synced: false,
    updatedAt: Date.now(),
  };

  await store.put(updated);
  await tx.done;
  return updated;
}

export async function markSynced(movieId) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const existing = await store.get(movieId);
  if (!existing) {
    await tx.done;
    return null;
  }

  const updated = {
    ...existing,
    synced: true,
    updatedAt: Date.now(),
  };

  await store.put(updated);
  await tx.done;
  return updated;
}

export async function mergeEntry(incomingEntry) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const local = await store.get(incomingEntry.id);

  if (!local) {
    await store.put(incomingEntry);
    await tx.done;
    return incomingEntry;
  }

  let winner;
  if (incomingEntry.updatedAt > local.updatedAt) {
    winner = incomingEntry;
  } else if (incomingEntry.updatedAt < local.updatedAt) {
    winner = local;
  } else {
    winner = local.deleted === false ? local : incomingEntry;
  }

  await store.put(winner);
  await tx.done;
  return winner;
}

export async function clearAll() {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.clear();
  await tx.done;
}
