import { createOptionalUpstashTaggedCache } from "./upstashTaggedCache";

const now = () => Date.now();
const hasValue = (value) => value !== null && value !== undefined;

export function createTaggedMemoryCache({ defaultTtlMs = 10 * 60 * 1000 } = {}) {
  const entries = new Map();
  const tagIndex = new Map();

  const remove = (key) => {
    const entry = entries.get(key);
    if (!entry) {
      return;
    }

    entry.tags.forEach((tag) => {
      const keys = tagIndex.get(tag);
      if (!keys) {
        return;
      }

      keys.delete(key);
      if (keys.size === 0) {
        tagIndex.delete(tag);
      }
    });

    entries.delete(key);
  };

  const set = async (key, value, options = {}) => {
    remove(key);

    const tags = new Set(options.tags || []);
    const ttlMs = options.ttlMs ?? defaultTtlMs;
    const entry = {
      value,
      tags,
      expiresAt: ttlMs === Infinity ? Infinity : now() + ttlMs,
      writtenAt: now(),
    };

    entries.set(key, entry);
    tags.forEach((tag) => {
      if (!tagIndex.has(tag)) {
        tagIndex.set(tag, new Set());
      }
      tagIndex.get(tag).add(key);
    });

    return value;
  };

  const get = async (key, options = {}) => {
    const entry = entries.get(key);
    if (!entry) {
      return null;
    }

    if (!options.allowStale && entry.expiresAt <= now()) {
      return null;
    }

    return entry.value;
  };

  const revalidateTag = async (tag) => {
    const keys = Array.from(tagIndex.get(tag) || []);
    keys.forEach(remove);
    return keys.length;
  };

  const sweep = async () => {
    let removed = 0;
    Array.from(entries.keys()).forEach((key) => {
      const entry = entries.get(key);
      if (entry && entry.expiresAt <= now()) {
        remove(key);
        removed += 1;
      }
    });
    return removed;
  };

  return {
    get,
    set,
    revalidateTag,
    sweep,
    size: () => entries.size,
    clear: () => {
      entries.clear();
      tagIndex.clear();
    },
  };
}

export function createTieredTaggedCache({
  l1 = createTaggedMemoryCache(),
  l2 = createOptionalUpstashTaggedCache(),
  defaultTtlMs = 10 * 60 * 1000,
} = {}) {
  const warmL1 = async (key, value, options = {}) => {
    try {
      await l1.set(key, value, {
        tags: options.tags || [],
        ttlMs: options.ttlMs ?? defaultTtlMs,
      });
    } catch (error) {
      // L2 reads should still succeed if the in-memory cache cannot be warmed.
    }
  };

  return {
    async get(key, options = {}) {
      const l1Value = await l1.get(key, options);
      if (hasValue(l1Value)) {
        return l1Value;
      }

      if (!l2) {
        return null;
      }

      try {
        const l2Value = await l2.get(key, options);
        if (hasValue(l2Value)) {
          await warmL1(key, l2Value, options);
          return l2Value;
        }
      } catch (error) {
        return null;
      }

      return null;
    },

    async set(key, value, options = {}) {
      await l1.set(key, value, options);

      if (l2) {
        try {
          await l2.set(key, value, options);
        } catch (error) {
          // Redis is an optional L2; L1 remains authoritative for this session.
        }
      }

      return value;
    },

    async revalidateTag(tag) {
      const l1Count = await l1.revalidateTag(tag);
      if (!l2) {
        return l1Count;
      }

      try {
        return l1Count + (await l2.revalidateTag(tag));
      } catch (error) {
        return l1Count;
      }
    },

    sweep() {
      return l1.sweep?.() || 0;
    },

    size() {
      return l1.size?.() || 0;
    },

    clear() {
      l1.clear?.();
    },
  };
}

export const taggedMemoryCache = createTaggedMemoryCache();
export const taggedCache = createTieredTaggedCache({
  l1: taggedMemoryCache,
  l2: createOptionalUpstashTaggedCache(),
});
