const Z = 1.96;

// The Wilson score confidence interval for a Bernoulli parameter.
// This is the lower bound of the 95% confidence interval.
export function wilsonScore(upvotes, downvotes) {
  const n = upvotes + downvotes;
  if (n === 0) return 0;
  const p = upvotes / n;

  const numerator =
    p + (Z * Z) / (2 * n) -
    Z *
      Math.sqrt((p * (1 - p) + (Z * Z) / (4 * n)) / n);
  const denominator = 1 + (Z * Z) / n;

  const result = numerator / denominator;
  return Math.max(0, Math.min(1, result));
}

export function controversyScore(upvotes, downvotes) {
  const n = upvotes + downvotes;
  if (n === 0) return 0;
  const balance = 1 - Math.abs(upvotes - downvotes) / n;
  return n * balance;
}

export function sortByWilson(reviews) {
  return [...reviews].sort(
    (a, b) => wilsonScore(b.upvotes, b.downvotes) - wilsonScore(a.upvotes, a.downvotes)
  );
}

export function sortByRecent(reviews) {
  return [...reviews].sort((a, b) => b.createdAt - a.createdAt);
}

export function sortByControversy(reviews) {
  return [...reviews].sort(
    (a, b) => controversyScore(b.upvotes, b.downvotes) - controversyScore(a.upvotes, a.downvotes)
  );
}

