// Lock memori untuk menahan double klik dan spam action singkat.
export class MemoryLocks {
  constructor() {
    this.items = new Map();
  }

  acquire(key, ttlMs = 3000) {
    const now = Date.now();
    const activeUntil = this.items.get(key) || 0;
    if (activeUntil > now) return false;

    this.items.set(key, now + ttlMs);
    setTimeout(() => this.release(key), ttlMs + 50).unref?.();
    return true;
  }

  release(key) {
    this.items.delete(key);
  }
}
