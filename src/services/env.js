/**
 * Environment variable validation and startup checks
 * Ensures credentials are properly configured and warns developers about silent fallbacks
 */

/**
 * Check if any TMDb credentials are configured
 */
function hasTmdbCredentials() {
  return !!(
    process.env.REACT_APP_TMDB_API_KEY || process.env.REACT_APP_TMDB_BEARER_TOKEN
  );
}

/**
 * Check if OMDb is configured
 */
function hasOmdbCredentials() {
  return !!process.env.REACT_APP_OMDB_API_KEY;
}

/**
 * Validate which provider will be used and warn if falling back to mock
 */
export function validateEnvironment() {
  const preferredProvider = process.env.REACT_APP_MOVIE_PROVIDER;
  const hasValidTmdb = hasTmdbCredentials();
  const hasValidOmdb = hasOmdbCredentials();

  const warnings = [];
  let activeProvider = null;

  // Check explicit provider selection
  if (preferredProvider === "tmdb" && !hasValidTmdb) {
    warnings.push(
      `⚠️  [CONFIG] REACT_APP_MOVIE_PROVIDER is set to "tmdb", but no TMDb credentials found.` +
        `\n   Expected: REACT_APP_TMDB_API_KEY or REACT_APP_TMDB_BEARER_TOKEN` +
        `\n   Action: Set credentials in .env or remove REACT_APP_MOVIE_PROVIDER to use auto-detection.`
    );
  }

  if (preferredProvider === "omdb" && !hasValidOmdb) {
    warnings.push(
      `⚠️  [CONFIG] REACT_APP_MOVIE_PROVIDER is set to "omdb", but no OMDb credentials found.` +
        `\n   Expected: REACT_APP_OMDB_API_KEY` +
        `\n   Action: Set credentials in .env or remove REACT_APP_MOVIE_PROVIDER to use auto-detection.`
    );
  }

  // Determine active provider with auto-detection
  if (preferredProvider === "omdb") {
    activeProvider = hasValidOmdb ? "omdb" : null;
  } else if (preferredProvider === "tmdb") {
    activeProvider = hasValidTmdb ? "tmdb" : null;
  } else if (hasValidTmdb) {
    activeProvider = "tmdb";
  } else if (hasValidOmdb) {
    activeProvider = "omdb";
  }

  // Warn if falling back to mock provider
  if (!activeProvider) {
    warnings.push(
      `⚠️  [CONFIG] No live API credentials detected!` +
        `\n   The app is running with mock/fallback data only.` +
        `\n   Real movie data will NOT be available.` +
        `\n\n   To enable live data, configure one of:` +
        `\n   - TMDb: Set REACT_APP_TMDB_API_KEY or REACT_APP_TMDB_BEARER_TOKEN` +
        `\n   - OMDb: Set REACT_APP_OMDB_API_KEY` +
        `\n\n   See .env.example for configuration details.`
    );
    activeProvider = "mock (fallback)";
  }

  // Log all warnings to console (only in non-production to avoid noisy logs)
  if (warnings.length > 0) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "\n🔍 [Environment Configuration]\n" +
          warnings.join("\n\n") +
          `\n\n📌 Active Provider: ${activeProvider}\n`
      );
    }
  } else {
    if (process.env.NODE_ENV !== "production") {
      console.log(`✅ [Environment] Movie provider configured: ${activeProvider}`);
    }
  }

  return {
    hasValidTmdb,
    hasValidOmdb,
    activeProvider,
    warnings,
  };
}

/**
 * Log which credentials are detected (for debugging)
 */
export function debugEnvironment() {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.group("🔧 [DEBUG] Environment Variables");
  console.log("REACT_APP_TMDB_API_KEY:", process.env.REACT_APP_TMDB_API_KEY ? "✓ Set" : "✗ Missing");
  console.log(
    "REACT_APP_TMDB_BEARER_TOKEN:",
    process.env.REACT_APP_TMDB_BEARER_TOKEN ? "✓ Set" : "✗ Missing"
  );
  console.log("REACT_APP_OMDB_API_KEY:", process.env.REACT_APP_OMDB_API_KEY ? "✓ Set" : "✗ Missing");
  console.log("REACT_APP_MOVIE_PROVIDER:", process.env.REACT_APP_MOVIE_PROVIDER || "(auto-detect)");
  console.groupEnd();
}
