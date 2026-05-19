import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReview,
  deleteReview,
  editReview,
  fetchReviews,
  flagReview,
  undoDelete,
  voteReview,
} from './reviewService';
import { useAuth } from '../auth/AuthContext';

export function useReviews(movieId) {
  const normalizedMovieId = Number(movieId);

  return useQuery({
    queryKey: ['reviews', normalizedMovieId],
    queryFn: () => fetchReviews(normalizedMovieId),
    enabled: Number.isInteger(normalizedMovieId) && normalizedMovieId > 0,
    staleTime: 30_000,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const {
    user: { id: userId, name: userName },
  } = useAuth();

  return useMutation({
    mutationFn: ({ movieId, rating, body, idempotencyKey }) =>
      createReview({ movieId, rating, body, idempotencyKey, userId, userName }),

    onMutate: async ({ movieId, rating, body, idempotencyKey }) => {
      await queryClient.cancelQueries({ queryKey: ['reviews', movieId] });

      const previousReviews = queryClient.getQueryData(['reviews', movieId]);

      const optimistic = {
        id: 'optimistic-' + Date.now(),
        movieId,
        rating,
        body,
        userId,
        userName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        deleted: false,
        upvotes: 0,
        downvotes: 0,
        userVote: null,
        revisions: [],
        flagged: false,
        _optimistic: true,
        _idempotencyKey: idempotencyKey,
      };

      queryClient.setQueryData(['reviews', movieId], (old) => [optimistic, ...(old || [])]);

      return { previousReviews };
    },

    onError: (error, vars, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(['reviews', vars.movieId], context.previousReviews);
      } else {
        queryClient.setQueryData(['reviews', vars.movieId], undefined);
      }
    },

    onSuccess: (serverReview, vars) => {
      queryClient.setQueryData(['reviews', vars.movieId], (old) => {
        const current = old || [];
        const replaced = current.map((review) =>
          review._idempotencyKey === vars.idempotencyKey ? serverReview : review
        );

        return replaced.some((review) => review.id === serverReview.id)
          ? replaced
          : [serverReview, ...replaced.filter((review) => !review._optimistic)];
      });
    },

    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', vars.movieId] });
    },
  });
}

export function useEditReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => editReview({ id, body }),
    onSuccess: (_updated, vars) => {
      // Can't reliably infer movieId without server shape; invalidate all reviews.
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => deleteReview(id),
    onMutate: async ({ id, movieId }) => {
      await queryClient.cancelQueries({ queryKey: ['reviews', movieId] });
      const previousReviews = queryClient.getQueryData(['reviews', movieId]);

      queryClient.setQueryData(['reviews', movieId], (old) => (old || []).filter((r) => r.id !== id));

      return { previousReviews };
    },
    onError: (err, vars, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(['reviews', vars.movieId], context.previousReviews);
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', vars.movieId] });
    },
  });
}

export function useVoteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, vote }) => voteReview({ reviewId, vote }),
    onMutate: async ({ reviewId, vote, movieId }) => {
      await queryClient.cancelQueries({ queryKey: ['reviews', movieId] });
      const previousReviews = queryClient.getQueryData(['reviews', movieId]);

      queryClient.setQueryData(['reviews', movieId], (old) =>
        (old || []).map((r) => {
          if (r.id !== reviewId) return r;

          const currentVote = r.userVote;
          let upvotes = r.upvotes;
          let downvotes = r.downvotes;
          let userVote = currentVote;

          if (currentVote === vote) {
            // toggle off
            if (vote === 'up') upvotes -= 1;
            if (vote === 'down') downvotes -= 1;
            userVote = null;
          } else {
            // switch or set
            if (currentVote === 'up' && vote === 'down') {
              upvotes -= 1;
              downvotes += 1;
            } else if (currentVote === 'down' && vote === 'up') {
              downvotes -= 1;
              upvotes += 1;
            } else if (!currentVote) {
              if (vote === 'up') upvotes += 1;
              if (vote === 'down') downvotes += 1;
            }
            userVote = vote;
          }

          return {
            ...r,
            upvotes,
            downvotes,
            userVote,
          };
        })
      );

      return { previousReviews };
    },
    onError: (err, vars, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(['reviews', vars.movieId], context.previousReviews);
      }
    },
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', vars.movieId] });
    },
  });
}

export function useFlagReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, reason }) => flagReview({ reviewId, reason }),
    onSuccess: (_updated, vars) => {
      // Flagging doesn't change sort computations much; invalidate all.
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

export function useUndoDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => undoDelete(id),
    onSuccess: (restoredReview, vars) => {
      // If we know movieId via restoredReview, update cache.
      const movieId = restoredReview?.movieId ?? vars.movieId;
      if (movieId) {
        queryClient.setQueryData(['reviews', movieId], (old) => {
          const arr = old || [];
          if (arr.some((r) => r.id === restoredReview.id)) return arr;
          return [restoredReview, ...arr];
        });
      }
    },
  });
}

