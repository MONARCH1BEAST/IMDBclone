import { openDB as idbOpenDB } from 'idb';

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = idbOpenDB('imdb-clone-db', 5, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('watchlist')) {
            db.createObjectStore('watchlist', { keyPath: 'id' });
          }
        }

        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('drafts')) {
            db.createObjectStore('drafts', { keyPath: 'movieId' });
          }
        }

        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('watchlist')) {
            db.createObjectStore('watchlist', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('drafts')) {
            db.createObjectStore('drafts', { keyPath: 'movieId' });
          }
        }

        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains('watchlist')) {
            db.createObjectStore('watchlist', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('drafts')) {
            db.createObjectStore('drafts', { keyPath: 'movieId' });
          }
        }

        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains('reviews')) {
            const reviewStore = db.createObjectStore('reviews', { keyPath: 'id' });
            reviewStore.createIndex('movieId', 'movieId', { unique: false });
          }
        }

        // If adding new stores in future: bump version number,
        // add a new "if (oldVersion < N)" block,
        // never modify or remove existing blocks.
      },
    });
  }

  return dbPromise;
}
