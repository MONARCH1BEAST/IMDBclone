import React, { useEffect, useState } from 'react';
import { useToast } from '../../components/feedback/ToastContext';
import { ReviewInputSchema } from './reviewSchemas';
import { checkProfanity } from './profanityFilter';
import { generateIdempotencyKey, getReviewErrorMessage } from './reviewService';
import { useCreateReview } from './useReviews';
import { getDraft, saveDraft, clearDraft } from './draftRepository';

export default function ReviewEditor({ movieId, onSuccess, onCancel }) {
  const createReviewMutation = useCreateReview();
  const toast = useToast();
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isProfanityWarningOpen, setIsProfanityWarningOpen] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const isSubmitting = createReviewMutation.isPending;

  useEffect(() => {
    let isMounted = true;
    setIsDraftReady(false);

    getDraft(movieId)
      .then((draft) => {
        if (!isMounted || !draft) return;
        setBody(draft.body || '');
        setRating(draft.rating ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setIsDraftReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [movieId]);

  useEffect(() => {
    if (!isDraftReady) {
      return;
    }

    saveDraft(movieId, { body, rating }).catch(() => {});
  }, [body, rating, isDraftReady, movieId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);
    setErrors({});

    const profanity = checkProfanity(body);
    if (profanity.hasProfanity) {
      setIsProfanityWarningOpen(true);
      return;
    }

    try {
      const parsed = ReviewInputSchema.parse({ movieId, rating, body });
      const createdReview = await createReviewMutation.mutateAsync({
        ...parsed,
        idempotencyKey: generateIdempotencyKey(),
      });

      await clearDraft(movieId).catch(() => {});
      toast.success('Review submitted', {
        message: 'Your review is now visible.',
      });
      onSuccess(createdReview);
    } catch (error) {
      if (error?.issues) {
        const fieldErrors = (error.issues || []).reduce((acc, issue) => {
          if (issue.path?.[0]) {
            acc[issue.path[0]] = issue.message;
          }
          return acc;
        }, {});
        setErrors(fieldErrors);
      } else {
        const message = getReviewErrorMessage(error);
        setSubmitError(message);
        toast.error('Review submission failed', { message });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-white">Rating</label>
        <select
          className="mt-2 w-full rounded-lg border bg-zinc-900 px-3 py-2 text-white"
          value={rating ?? ''}
          onChange={(event) => setRating(Number(event.target.value) || null)}
        >
          <option value="">Select rating</option>
          {[...Array(10)].map((_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1}
            </option>
          ))}
        </select>
        {errors.rating && <p className="mt-1 text-sm text-red-400">{errors.rating}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-white">Review</label>
        <textarea
          className="mt-2 w-full min-h-[140px] rounded-lg border bg-zinc-900 px-3 py-2 text-white"
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setIsProfanityWarningOpen(false);
          }}
        />
        {errors.body && <p className="mt-1 text-sm text-red-400">{errors.body}</p>}
      </div>

      {isProfanityWarningOpen && (
        <div className="rounded-xl border border-amber-500 bg-amber-500/10 p-4 text-sm text-amber-100">
          Your review contains words that may be inappropriate. Please revise it.
        </div>
      )}

      {submitError && <p className="text-sm text-red-400">{submitError}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-zinc-700 px-5 py-3 text-white hover:border-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
