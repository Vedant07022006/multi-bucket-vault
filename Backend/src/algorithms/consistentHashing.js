import crypto from "crypto";

/**
 * Consistent Hashing Ring — Singleton Pattern
 *
 * Maps chunk keys to buckets so that adding/removing a bucket only
 * reshuffles a small fraction of assignments (O(K/N) where K = virtual nodes,
 * N = buckets) — unlike naive modulo hashing which reshuffles everything.
 *
 * Used by: bucket.service.js when assigning chunks to buckets.
 *
 * Production note: with multiple Node.js instances, the ring state must
 * be synced via Redis so all instances agree. The Singleton pattern still
 * applies conceptually (one logical ring) — only the backing store moves.
 */
class ConsistentHashRing {
  /** @type {ConsistentHashRing} */
  static #instance = null;

  /** Number of virtual nodes per real bucket — higher = more even distribution */
  static VIRTUAL_NODES = 150;

  constructor() {
    // Sorted array of { hash, bucketId } — the ring
    this.ring = [];
    // Set of real bucket IDs currently in the ring
    this.buckets = new Set();
  }

  /** @returns {ConsistentHashRing} */
  static getInstance() {
    if (!ConsistentHashRing.#instance) {
      ConsistentHashRing.#instance = new ConsistentHashRing();
    }
    return ConsistentHashRing.#instance;
  }

  /** MD5 hash of a string → unsigned 32-bit integer (fast, not for security) */
  #hash(key) {
    return parseInt(crypto.createHash("md5").update(key).digest("hex").slice(0, 8), 16);
  }

  /**
   * Add a bucket to the ring by inserting VIRTUAL_NODES virtual points.
   * @param {string} bucketId
   */
  addBucket(bucketId) {
    if (this.buckets.has(bucketId)) return;

    for (let i = 0; i < ConsistentHashRing.VIRTUAL_NODES; i++) {
      const virtualKey = `${bucketId}:vnode:${i}`;
      const hash = this.#hash(virtualKey);
      this.ring.push({ hash, bucketId });
    }

    // Keep the ring sorted by hash for binary search in getBucketForKey
    this.ring.sort((a, b) => a.hash - b.hash);
    this.buckets.add(bucketId);
  }

  /**
   * Remove a bucket and all its virtual nodes from the ring.
   * @param {string} bucketId
   */
  removeBucket(bucketId) {
    this.ring = this.ring.filter((node) => node.bucketId !== bucketId);
    this.buckets.delete(bucketId);
  }

  /**
   * Map a key (e.g. chunk content hash) to its responsible bucket.
   * Walks clockwise on the ring — wraps around if past the last node.
   * @param {string} key
   * @returns {string|null} bucketId, or null if ring is empty
   */
  getBucketForKey(key) {
    if (this.ring.length === 0) return null;

    const keyHash = this.#hash(key);

    // Binary search for first ring node with hash >= keyHash
    let lo = 0;
    let hi = this.ring.length - 1;

    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (this.ring[mid].hash < keyHash) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    // Wrap around to the start of the ring if needed
    const index = this.ring[lo].hash >= keyHash ? lo : 0;
    return this.ring[index].bucketId;
  }

  /** Returns the current set of real bucket IDs on the ring */
  getBuckets() {
    return [...this.buckets];
  }
}

export default ConsistentHashRing;
