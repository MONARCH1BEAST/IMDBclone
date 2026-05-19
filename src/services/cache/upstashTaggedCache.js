const defaultFetch = () => {
  if (typeof window !== "undefined" && window.fetch) {
    return window.fetch.bind(window);
  }

  if (typeof fetch !== "undefined") {
    return fetch;
  }

  return undefined;
};

const env = (key) =>
  typeof process !== "undefined" && process.env ? process.env[key] : undefined;

const encoder =
  typeof TextEncoder !== "undefined" ? new TextEncoder() : undefined;

function bytes(value) {
  if (encoder) {
    return encoder.encode(value).length;
  }

  return unescape(encodeURIComponent(value)).length;
}

function keyFor(namespace, key) {
  return `${namespace}:entry:${key}`;
}

function tagKey(namespace, tag) {
  return `${namespace}:tag:${tag}`;
}

async function upstash(fetchImpl, url, token, command) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`Upstash command failed with ${response.status}.`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error);
  }
  return payload.result;
}

export function createUpstashTaggedCache({
  url = env("REACT_APP_UPSTASH_REDIS_REST_URL") || env("UPSTASH_REDIS_REST_URL"),
  token =
    env("REACT_APP_UPSTASH_REDIS_REST_TOKEN") ||
    env("UPSTASH_REDIS_REST_TOKEN"),
  namespace =
    env("REACT_APP_UPSTASH_REDIS_NAMESPACE") ||
    env("UPSTASH_REDIS_NAMESPACE") ||
    "movie-cache",
  defaultTtlSeconds = 600,
  maxEntryBytes = 512 * 1024,
  fetchImpl = defaultFetch(),
} = {}) {
  if (!url || !token) {
    throw new Error("Upstash Redis REST URL and token are required.");
  }

  if (!fetchImpl) {
    throw new Error("A fetch implementation is required for Upstash Redis.");
  }

  return {
    async get(key, options = {}) {
      const raw = await upstash(fetchImpl, url, token, [
        "GET",
        keyFor(namespace, key),
      ]);
      if (!raw) {
        return null;
      }

      const entry = JSON.parse(raw);
      if (!options.allowStale && entry.expiresAt <= Date.now()) {
        return null;
      }

      return entry.value;
    },

    async set(key, value, options = {}) {
      const tags = options.tags?.length ? options.tags : ["movies"];
      const ttlMs = options.ttlMs ?? defaultTtlSeconds * 1000;
      const ttlSeconds =
        ttlMs === Infinity ? null : Math.max(1, Math.ceil(ttlMs / 1000));
      const entry = JSON.stringify({
        value,
        tags,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity,
        writtenAt: Date.now(),
      });

      if (bytes(entry) > maxEntryBytes) {
        throw new Error("Cache entry is too large for the configured limit.");
      }

      const command = ttlSeconds
        ? ["SET", keyFor(namespace, key), entry, "EX", ttlSeconds]
        : ["SET", keyFor(namespace, key), entry];

      await upstash(fetchImpl, url, token, command);
      await Promise.all(
        tags.map((tag) =>
          upstash(fetchImpl, url, token, ["SADD", tagKey(namespace, tag), key])
        )
      );
      return value;
    },

    async revalidateTag(tag) {
      const indexKey = tagKey(namespace, tag);
      const keys = await upstash(fetchImpl, url, token, ["SMEMBERS", indexKey]);
      if (!keys?.length) {
        return 0;
      }

      await upstash(fetchImpl, url, token, [
        "DEL",
        ...keys.map((key) => keyFor(namespace, key)),
        indexKey,
      ]);
      return keys.length;
    },
  };
}

export function createOptionalUpstashTaggedCache(options = {}) {
  const url =
    options.url ||
    env("REACT_APP_UPSTASH_REDIS_REST_URL") ||
    env("UPSTASH_REDIS_REST_URL");
  const token =
    options.token ||
    env("REACT_APP_UPSTASH_REDIS_REST_TOKEN") ||
    env("UPSTASH_REDIS_REST_TOKEN");

  if (!url || !token) {
    return null;
  }

  try {
    return createUpstashTaggedCache({
      ...options,
      url,
      token,
    });
  } catch (error) {
    return null;
  }
}
