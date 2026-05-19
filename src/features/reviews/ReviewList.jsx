import React from 'react';
import ReviewCard from './ReviewCard';

export default function ReviewList({ reviews, movieId }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-gray-950 p-8 text-center text-zinc-400">
        No reviews have been posted yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} movieId={movieId || review.movieId} />
      ))}
    </div>
  );
}
