import React, {
  useCallback,
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  addEntry,
  getAllEntries,
  markSynced,
  mergeEntry,
  removeEntry,
} from './watchlistRepository';

export const WatchlistContext = createContext(null);
const WATCHLIST_SYNC_PROVIDER = process.env.REACT_APP_WATCHLIST_SYNC_PROVIDER === 'api' ? 'api' : 'local';

function normalizeMovieId(movieId) {
  return typeof movieId === 'string' ? Number(movieId) : movieId;
}

const WatchlistProvider = ({ children }) => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const channelRef = useRef(null);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const loaded = await getAllEntries();
      setEntries(loaded);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();

    if (typeof BroadcastChannel === 'undefined') {
      return undefined;
    }

    const channel = new BroadcastChannel('watchlist');
    channelRef.current = channel;

    channel.onmessage = async (event) => {
      const payload = event.data || {};
      if (payload.type === 'ENTRY_CHANGED' && payload.entry) {
        try {
          await mergeEntry(payload.entry);
          await loadEntries();
        } catch (err) {
          setError(err);
        }
      }

      if (payload.type === 'SYNCED' && typeof payload.movieId !== 'undefined') {
        try {
          await markSynced(payload.movieId);
          await loadEntries();
        } catch (err) {
          setError(err);
        }
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const isWatchlisted = useCallback((movieId) => {
    const normalized = normalizeMovieId(movieId);
    return entries.some((entry) => entry.id === normalized && entry.deleted === false);
  }, [entries]);

  const postBroadcastMessage = useCallback((message) => {
    if (channelRef.current) {
      channelRef.current.postMessage(message);
    }
  }, []);

  const applySyncedEntry = useCallback((syncedEntry) => {
    if (!syncedEntry) {
      return;
    }

    setEntries((current) => {
      if (syncedEntry.deleted) {
        return current.filter((entry) => entry.id !== syncedEntry.id);
      }

      return [...current.filter((entry) => entry.id !== syncedEntry.id), syncedEntry];
    });
  }, []);

  const registerBackgroundSync = useCallback(() => {
    if (WATCHLIST_SYNC_PROVIDER !== 'api') {
      return;
    }

    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.ready
      .then((registration) => {
        if ('sync' in registration) {
          registration.sync.register('watchlist-sync').catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const syncRequest = useCallback(async (movieId, method, body, action) => {
    if (WATCHLIST_SYNC_PROVIDER !== 'api') {
      const syncedEntry = await markSynced(movieId);
      applySyncedEntry(syncedEntry);
      postBroadcastMessage({ type: 'SYNCED', movieId, action });
      setSyncStatus('idle');
      return { synced: true, provider: 'local' };
    }

    setSyncStatus('syncing');
    try {
      const endpoint =
        method === 'DELETE'
          ? `/api/watchlist/${encodeURIComponent(movieId)}`
          : '/api/watchlist';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with ${response.status}`);
      }

      const syncedEntry = await markSynced(movieId);
      applySyncedEntry(syncedEntry);
      postBroadcastMessage({ type: 'SYNCED', movieId, action });
      setSyncStatus('idle');
      return { synced: true, provider: 'api' };
    } catch (err) {
      setSyncStatus('error');
      setError(err);
      return { synced: false, provider: 'api', error: err };
    }
  }, [applySyncedEntry, postBroadcastMessage]);

  const toggleWatchlist = useCallback(async (movie) => {
    const movieId = normalizeMovieId(movie.id);
    const isListed = isWatchlisted(movieId);
    const previousEntries = entries;

    if (!isListed) {
      const optimisticEntry = {
        id: movieId,
        title: movie.title,
        poster: movie.poster ?? null,
        addedAt: Date.now(),
        updatedAt: Date.now(),
        synced: false,
        deleted: false,
      };

      setEntries((current) => [...current.filter((item) => item.id !== movieId), optimisticEntry]);

      let storedEntry = optimisticEntry;
      try {
        storedEntry = await addEntry({
          id: movieId,
          title: movie.title,
          poster: movie.poster ?? null,
        });
        setError(null);
      } catch (err) {
        setEntries(previousEntries);
        setError(err);
        throw err;
      }

      postBroadcastMessage({ type: 'ENTRY_CHANGED', entry: storedEntry });
      const syncResult = await syncRequest(
        movieId,
        'POST',
        { movieId, title: movie.title, poster: movie.poster ?? null },
        'add'
      );
      registerBackgroundSync();
      return { action: 'added', entry: storedEntry, sync: syncResult };
    }

    setEntries((current) => current.filter((entry) => entry.id !== movieId));

    let removedEntry = null;
    try {
      removedEntry = await removeEntry(movieId);
      setError(null);
    } catch (err) {
      setEntries(previousEntries);
      setError(err);
      throw err;
    }

    if (removedEntry) {
      postBroadcastMessage({ type: 'ENTRY_CHANGED', entry: removedEntry });
      const syncResult = await syncRequest(movieId, 'DELETE', { movieId }, 'remove');
      registerBackgroundSync();
      return { action: 'removed', entry: removedEntry, sync: syncResult };
    }

    return { action: 'removed', entry: null, sync: { synced: true, provider: 'local' } };
  }, [entries, isWatchlisted, postBroadcastMessage, registerBackgroundSync, syncRequest]);

  const value = useMemo(
    () => ({
      entries,
      isLoading,
      error,
      isWatchlisted,
      toggleWatchlist,
      syncStatus,
    }),
    [entries, error, isLoading, isWatchlisted, syncStatus, toggleWatchlist]
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
};

export default WatchlistProvider;
