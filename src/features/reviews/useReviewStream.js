import { useEffect } from 'react';
import { getReviewProvider } from './reviewService';

export function useReviewStream(movieId, { onNewReview, onVoteUpdate, onError } = {}) {
  useEffect(() => {
    if (!movieId || typeof EventSource === 'undefined' || getReviewProvider() !== 'api') return;

    const es = new EventSource(`/api/reviews/stream?movieId=${movieId}`);

    let debounceTimer = null;
    const pendingUpdates = [];

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        pendingUpdates.push(data);

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const updates = [...pendingUpdates];
          pendingUpdates.length = 0;

          updates.forEach((update) => {
            if (update.type === 'new_review') onNewReview?.(update.review);
            if (update.type === 'vote_update') onVoteUpdate?.(update);
          });
        }, 500);
      } catch (e) {
        onError?.(e);
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      clearTimeout(debounceTimer);
      es.close();
    };
  }, [movieId]);
}

