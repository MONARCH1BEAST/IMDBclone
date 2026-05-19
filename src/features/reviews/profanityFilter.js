const BLOCKED_WORDS = ['spam', 'scam', 'hate', 'slur1', 'slur2'];

export function checkProfanity(text) {
  const matches = BLOCKED_WORDS.filter((word) =>
    new RegExp('\\b' + word + '\\b', 'i').test(text)
  );

  return {
    hasProfanity: matches.length > 0,
    matchedWords: matches,
  };
}

