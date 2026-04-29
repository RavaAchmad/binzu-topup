// Cache TTL kecil yang kompatibel dengan kebutuhan cache Baileys.
export class TtlCache {
  constructor({ ttlMs = 5 * 60 * 1000, max = 1000 } = {}) {
    this.ttlMs = ttlMs;
    this.max = max;
    this.items = new Map();
  }

  get(key) {
    const item = this.items.get(key);
    if (!item) return undefined;
    if (item.expiresAt <= Date.now()) {
      this.items.delete(key);
      return undefined;
    }
    return item.value;
  }

  set(key, value, ttlSeconds) {
    const ttlMs = Number.isFinite(ttlSeconds) ? ttlSeconds * 1000 : this.ttlMs;
    this.items.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
    this.prune();
    return true;
  }

  del(key) {
    this.items.delete(key);
    return true;
  }

  delete(key) {
    return this.del(key);
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  clear() {
    this.items.clear();
  }

  prune() {
    const now = Date.now();
    for (const [key, item] of this.items.entries()) {
      if (item.expiresAt <= now) this.items.delete(key);
    }

    while (this.items.size > this.max) {
      const oldest = this.items.keys().next().value;
      this.items.delete(oldest);
    }
  }
}
