import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Flag, X } from 'lucide-react';
import { diffWords } from 'diff';
import { useToast } from '../../components/feedback/ToastContext';
import { useVoteReview, useFlagReview, useEditReview, useDeleteReview } from './useReviews';
import { useAuth } from '../auth/AuthContext';
import { getReviewErrorMessage } from './reviewService';

export default function ReviewCard({ review, movieId }) {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const voteReviewMutation = useVoteReview();
  const flagReviewMutation = useFlagReview();
  const editReviewMutation = useEditReview();
  const deleteReviewMutation = useDeleteReview();

  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagError, setFlagError] = useState('');
  const [flagSuccess, setFlagSuccess] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(review.body);
  const [editError, setEditError] = useState('');

  const isAuthor = review.userId === currentUser.id;
  const resolvedMovieId = movieId || review.movieId;

  const handleVote = (vote) => {
    voteReviewMutation.mutate(
      { reviewId: review.id, vote, movieId: resolvedMovieId },
      {
        onError: (err) => {
          toast.error('Vote not saved', {
            message: getReviewErrorMessage(err),
          });
        },
      }
    );
  };

  const handleEditSave = async () => {
    if (!editBody.trim() || editBody.trim().length < 10) {
      setEditError('Review must be at least 10 characters.');
      return;
    }

    setEditError('');

    try {
      await editReviewMutation.mutateAsync({ id: review.id, body: editBody.trim() });
      toast.success('Review updated', {
        message: 'Your review changes were saved.',
      });
      setIsEditing(false);
    } catch (err) {
      const message = getReviewErrorMessage(err);
      setEditError(message);
      toast.error('Update failed', { message });
    }
  };

  const handleRemoveReview = async () => {
    const confirmed = window.confirm('Remove this review? This cannot be undone from the UI.');
    if (!confirmed) {
      return;
    }

    try {
      await deleteReviewMutation.mutateAsync({ id: review.id, movieId: resolvedMovieId });
      toast.success('Review removed', {
        message: 'The review has been deleted.',
      });
    } catch (err) {
      toast.error('Delete failed', {
        message: getReviewErrorMessage(err),
      });
    }
  };

  const handleFlagSubmit = async () => {
    setFlagError('');

    if (!flagReason.trim()) {
      setFlagError('Reason is required');
      return;
    }

    if (flagReason.length > 200) {
      setFlagError('Reason must be 200 characters or less');
      return;
    }

    flagReviewMutation.mutate(
      { reviewId: review.id, reason: flagReason.trim() },
      {
        onSuccess: () => {
          setFlagSuccess(true);
          setFlagReason('');
          setShowFlagForm(false);
          toast.success('Report submitted', {
            message: 'Thanks for helping keep reviews useful.',
          });
          setTimeout(() => setFlagSuccess(false), 3000);
        },
        onError: (err) => {
          const message = getReviewErrorMessage(err);
          setFlagError(message);
          toast.error('Report failed', { message });
        },
      }
    );
  };

  const renderHistoryModal = () => {
    if (!showHistoryModal || !review.revisions || review.revisions.length === 0) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="max-h-96 w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-700 bg-gray-950 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Edit History</h2>
            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="text-zinc-400 hover:text-white"
              aria-label="Close edit history"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="font-mono text-sm text-zinc-300">
                Version 1 (Created {new Date(review.createdAt).toLocaleString()})
              </p>
              <p className="whitespace-pre-wrap rounded bg-zinc-900 p-3 text-sm text-zinc-200">
                {review.revisions[0]?.originalBody || review.revisions[0]?.body || review.body}
              </p>
            </div>

            {review.revisions.map((revision, idx) => {
              const previousRevision = review.revisions[idx - 1];
              const prevBody =
                revision.originalBody ||
                previousRevision?.newBody ||
                previousRevision?.body ||
                review.body;
              const nextBody = revision.newBody || revision.body || review.body;
              const diffs = diffWords(prevBody, nextBody);

              return (
                <div key={revision.id || `${revision.editedAt}-${idx}`} className="space-y-2 border-t border-zinc-800 pt-4">
                  <p className="font-mono text-sm text-zinc-300">
                    Version {revision.version} edited ({new Date(revision.editedAt).toLocaleString()})
                  </p>
                  <div className="rounded bg-zinc-900 p-3">
                    <div className="flex flex-wrap gap-1 whitespace-pre-wrap text-sm">
                      {diffs.map((part, index) => {
                        if (part.added) {
                          return (
                            <span key={index} className="bg-green-100 text-green-900">
                              {part.value}
                            </span>
                          );
                        }

                        if (part.removed) {
                          return (
                            <span key={index} className="bg-red-100 text-red-900 line-through">
                              {part.value}
                            </span>
                          );
                        }

                        return (
                          <span key={index} className="text-zinc-200">
                            {part.value}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <article className="rounded-2xl border border-zinc-800 bg-gray-950 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{review.userName}</h3>
            <p className="text-sm text-zinc-400">Rating: {review.rating}/10</p>
          </div>
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
            {new Date(review.createdAt).toLocaleDateString()}
          </span>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-white">Edit review</label>
            <textarea
              value={editBody}
              onChange={(event) => setEditBody(event.target.value)}
              className="w-full rounded-lg border bg-zinc-900 px-3 py-2 text-white"
              rows={6}
            />
            {editError && <p className="text-sm text-red-400">{editError}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleEditSave}
                disabled={editReviewMutation.isPending}
                className="rounded-xl bg-yellow-500 px-4 py-2 font-semibold text-black hover:bg-yellow-400 transition-colors"
              >
                {editReviewMutation.isPending ? 'Saving...' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditError('');
                  setEditBody(review.body);
                }}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-zinc-200">{review.body}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={() => handleVote('up')}
            className={`flex items-center gap-1 rounded px-3 py-2 transition ${
              review.userVote === 'up'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            disabled={voteReviewMutation.isPending}
          >
            <ThumbsUp size={16} />
            <span className="text-sm">{review.upvotes}</span>
          </button>

          <button
            type="button"
            onClick={() => handleVote('down')}
            className={`flex items-center gap-1 rounded px-3 py-2 transition ${
              review.userVote === 'down'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            disabled={voteReviewMutation.isPending}
          >
            <ThumbsDown size={16} />
            <span className="text-sm">{review.downvotes}</span>
          </button>

          {review.revisions && review.revisions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              View edits ({review.revisions.length})
            </button>
          )}

          {isAuthor && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing((current) => !current)}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:border-white hover:text-white"
                disabled={editReviewMutation.isPending}
              >
                {isEditing ? 'Cancel edit' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={handleRemoveReview}
                className="rounded-full border border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20"
                disabled={deleteReviewMutation.isPending}
              >
                {deleteReviewMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}

          {!isAuthor && !flagSuccess && (
            <button
              type="button"
              onClick={() => setShowFlagForm(!showFlagForm)}
              className="ml-auto flex items-center gap-1 text-sm text-zinc-400 transition hover:text-amber-500"
              disabled={flagReviewMutation.isPending}
            >
              <Flag size={16} />
              Report
            </button>
          )}

          {flagSuccess && (
            <span className="ml-auto text-sm text-green-500">Reported</span>
          )}
        </div>

        {showFlagForm && !isAuthor && (
          <div className="mt-4 space-y-3 rounded-lg border border-amber-600/30 bg-amber-900/10 p-4">
            <label className="block text-sm font-medium text-white">
              Report reason (max 200 chars)
            </label>
            <textarea
              value={flagReason}
              onChange={(event) => {
                setFlagReason(event.target.value);
                setFlagError('');
              }}
              placeholder="Describe why you're reporting this review..."
              maxLength={200}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-600 focus:outline-none"
              rows={3}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-400">{flagReason.length}/200</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFlagForm(false);
                    setFlagReason('');
                    setFlagError('');
                  }}
                  className="rounded bg-zinc-800 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFlagSubmit}
                  disabled={flagReviewMutation.isPending || !flagReason.trim()}
                  className="rounded bg-amber-600 px-3 py-1 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Submit Report
                </button>
              </div>
            </div>
            {flagError && <p className="text-xs text-red-500">{flagError}</p>}
          </div>
        )}
      </article>

      {renderHistoryModal()}
    </>
  );
}
