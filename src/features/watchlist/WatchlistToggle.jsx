import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Check } from 'lucide-react';
import { useWatchlist } from './useWatchlist';
import { useToast } from '../../components/feedback/ToastContext';

const sizeMap = {
  sm: { button: 'w-8 h-8', icon: 16 },
  md: { button: 'w-10 h-10', icon: 20 },
  lg: { button: 'w-12 h-12', icon: 24 },
};

const hiddenLiveStyles = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export default function WatchlistToggle({ movie, size = 'md', className = '' }) {
  const { isWatchlisted, toggleWatchlist, syncStatus } = useWatchlist();
  const toast = useToast();
  const [animState, setAnimState] = useState('idle');
  const [announce, setAnnounce] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const timeoutIds = useRef([]);
  const watched = isWatchlisted(movie.id);
  const variant = sizeMap[size] || sizeMap.md;

  useEffect(() => {
    const timeoutRef = timeoutIds;
    return () => {
      timeoutRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (!announce) {
      return;
    }
    const timer = window.setTimeout(() => setAnnounce(''), 3000);
    return () => window.clearTimeout(timer);
  }, [announce]);

  const handleClick = async () => {
    if (isUpdating) {
      return;
    }

    setAnimState('pressing');
    timeoutIds.current.forEach((id) => clearTimeout(id));

    timeoutIds.current.push(
      window.setTimeout(() => setAnimState('expanding'), 80),
      window.setTimeout(() => setAnimState('success'), 180),
      window.setTimeout(() => setAnimState('idle'), 600)
    );

    setIsUpdating(true);

    try {
      const result = await toggleWatchlist(movie);
      const removed = result?.action === 'removed' || watched;
      const message = removed
        ? `Removed ${movie.title} from bookmarks`
        : `Added ${movie.title} to bookmarks`;

      setAnnounce(message);
      toast.success(removed ? 'Bookmark removed' : 'Bookmark added', {
        message: movie.title,
      });

      if (result?.sync?.provider === 'api' && result.sync.synced === false) {
        toast.warning('Saved locally', {
          message: 'Remote bookmark sync will retry when available.',
        });
      }
    } catch (error) {
      const message = `Could not update ${movie.title}.`;
      setAnnounce(message);
      toast.error('Bookmark update failed', {
        message: error.message || 'Please try again.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const icon = watched ? (
    <Check size={variant.icon} />
  ) : (
    <Bookmark size={variant.icon} />
  );

  return (
    <div className={`relative inline-flex ${className}`}>
      <motion.button
        type="button"
        onClick={handleClick}
        aria-label={
          watched
            ? `Remove ${movie.title} from bookmarks`
            : `Add ${movie.title} to bookmarks`
        }
        aria-pressed={watched}
        disabled={isUpdating}
        className={`relative inline-flex items-center justify-center rounded-full bg-gray-800/80 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/50 ${variant.button}`}
        animate={{
          scale:
            animState === 'pressing'
              ? 0.85
              : animState === 'expanding'
              ? 1.15
              : 1,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={watched ? 'checked' : 'bookmark'}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center justify-center"
          >
            {icon}
          </motion.span>
        </AnimatePresence>
        {syncStatus !== 'idle' && (
          <span
            className={`absolute top-0 right-0 inline-flex h-2 w-2 rounded-full ${
              syncStatus === 'syncing' ? 'bg-blue-400 animate-pulse' : 'bg-red-500'
            }`}
          />
        )}
      </motion.button>
      <div role="status" aria-live="polite" style={hiddenLiveStyles}>
        {announce}
      </div>
    </div>
  );
}
