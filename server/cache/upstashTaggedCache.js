const encoder = new TextEncoder();

function bytes(value) {
  return encoder.encode(value).length;
}

function keyFor(namespace, key) {
  return `${namespace}:entry:${key}`;
}

function tagKey(namespace, tag) {
  return `${namespace}:tag:${tag}`;
}

async function upstash(url, token, command) {
  const response = await fetch(url, {
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
  url = process.env.UPSTASH_REDIS_REST_URL,
  token = process.env.UPSTASH_REDIS_REST_TOKEN,
  namespace = "movie-cache",
  defaultTtlSeconds = 600,
  maxEntryBytes = 512 * 1024,
} = {}) {
  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required.");
  }

  return {
    async get(key, options = {}) {
      const raw = await upstash(url, token, ["GET", keyFor(namespace, key)]);
      if (!raw) {
        return null;
      }

      const entry = JSON.parse(raw);
      if (!options.allowStale && entry.expiresAt <= Date.now()) {
        await upstash(url, token, ["DEL", keyFor(namespace, key)]);
        return null;
      }

      return entry.value;
    },

    async set(key, value, options = {}) {
      const tags = options.tags?.length ? options.tags : ["movies"];
      const ttlSeconds = Math.ceil((options.ttlMs || defaultTtlSeconds * 1000) / 1000);
      const entry = JSON.stringify({
        value,
        tags,
        expiresAt: Date.now() + ttlSeconds * 1000,
        writtenAt: Date.now(),
      });

      if (bytes(entry) > maxEntryBytes) {
        throw new Error("Cache entry is too large for the configured limit.");
      }

      await upstash(url, token, ["SET", keyFor(namespace, key), entry, "EX", ttlSeconds]);
      await Promise.all(
        tags.map((tag) =>
          upstash(url, token, ["SADD", tagKey(namespace, tag), key])
        )
      );
      return value;
    },

    async revalidateTag(tag) {
      const indexKey = tagKey(namespace, tag);
      const keys = await upstash(url, token, ["SMEMBERS", indexKey]);
      if (!keys?.length) {
        return 0;
      }

      await upstash(url, token, [
        "DEL",
        ...keys.map((key) => keyFor(namespace, key)),
        indexKey,
      ]);
      return keys.length;
    },
  };
}
