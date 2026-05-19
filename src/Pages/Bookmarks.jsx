import React from 'react';
import { Bookmark, Film, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/feedback/ToastContext';
import { useWatchlist } from '../features/watchlist/useWatchlist';

function posterFor(entry) {
  return entry.poster || null;
}

export default function Bookmarks() {
  const { entries, error, isLoading, toggleWatchlist, syncStatus } = useWatchlist();
  const toast = useToast();

  const removeBookmark = async (entry) => {
    try {
      const result = await toggleWatchlist({
        id: entry.id,
        title: entry.title,
        poster: entry.poster ?? null,
      });
      toast.success('Bookmark removed', { message: entry.title });
      if (result?.sync?.provider === 'api' && result.sync.synced === false) {
        toast.warning('Saved locally', {
          message: 'Remote bookmark sync will retry when available.',
        });
      }
    } catch (err) {
      toast.error('Bookmark update failed', {
        message: err.message || 'Please try again.',
      });
    }
  };

  const syncMessage =
    syncStatus === 'syncing'
      ? 'Syncing watchlist…'
      : syncStatus === 'error'
      ? 'Watchlist sync failed. Your saved movies are still available locally.'
      : null;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-300">
              <Bookmark className="h-4 w-4" />
              {entries.length} saved
            </div>
            <h1 className="text-3xl font-bold md:text-4xl">Watchlist</h1>
            {syncMessage && (
              <p className="mt-2 text-sm text-zinc-400">{syncMessage}</p>
            )}
          </div>
          <Link
            to="/movies"
            className="rounded-lg bg-yellow-500 px-4 py-2 font-semibold text-black transition hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
          >
            Browse Movies
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
            Bookmarks could not be fully synced. Your local saved movies are still available when storage permits.
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="aspect-[2/3] animate-pulse rounded-lg bg-zinc-900"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <section className="flex min-h-[45vh] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 px-6 text-center">
            <Film className="mb-4 h-12 w-12 text-zinc-500" />
            <h2 className="text-xl font-semibold">No bookmarks yet</h2>
            <p className="mt-2 max-w-md text-zinc-400">
              Save movies from a detail page and they will appear here across refreshes.
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {entries.map((entry) => {
              const poster = posterFor(entry);

              return (
                <article
                  key={entry.id}
                  className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/70"
                >
                  <Link to={`/movie/${entry.id}`} className="block">
                    <div className="aspect-[2/3] bg-zinc-950">
                      {poster ? (
                        <img
                          src={poster}
                          alt={entry.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500">
                          Poster unavailable
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="space-y-3 p-3">
                    <Link
                      to={`/movie/${entry.id}`}
                      className="block truncate font-semibold text-white hover:text-yellow-300"
                    >
                      {entry.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeBookmark(entry)}
                      className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-red-400 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
