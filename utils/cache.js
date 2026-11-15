/**
 * Lightweight In-Memory TTL Cache for High-Frequency Read APIs
 * Accelerates public landing page responses to ~1ms and shields MongoDB Atlas
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value, ttlSeconds = 60) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  del(key) {
    this.cache.delete(key);
  }

  clearPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clearAll() {
    this.cache.clear();
  }
}

export const apiCache = new MemoryCache();
export default apiCache;
