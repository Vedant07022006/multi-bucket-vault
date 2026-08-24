import crypto from "crypto";

/**
 * Bloom Filter
 *
 * A probabilistic data structure that answers "have I probably seen this item?"
 * without storing the items themselves.
 *
 * - False positives are possible (says "yes" when actually "no") — we handle this
 *   by doing a real DB lookup to confirm before treating it as a duplicate.
 * - False negatives are impossible (if it says "no", the item definitely isn't there).
 *
 * Used by: dedup.service.js to avoid a MongoDB lookup for every chunk — only
 * chunks that pass the Bloom filter trigger a real DB lookup.
 */
class BloomFilter {
  /**
   * @param {number} size - Bit-array size (larger = fewer false positives)
   * @param {number} hashCount - Number of independent hash functions to use
   */
  constructor(size = 1_000_000, hashCount = 5) {
    this.size = size;
    this.hashCount = hashCount;
    // Use a Uint8Array as a compact bit array
    this.bits = new Uint8Array(Math.ceil(size / 8));
  }

  /**
   * Generate `hashCount` independent hash positions for an item.
   * Uses double hashing: h_i(x) = (hash1(x) + i * hash2(x)) % size
   * to simulate independent hash functions from two real ones.
   */
  #hashes(item) {
    const str = typeof item === "string" ? item : item.toString("hex");
    const h1 = parseInt(crypto.createHash("md5").update(str).digest("hex").slice(0, 8), 16);
    const h2 = parseInt(crypto.createHash("sha1").update(str).digest("hex").slice(0, 8), 16);

    const positions = [];
    for (let i = 0; i < this.hashCount; i++) {
      positions.push(Math.abs((h1 + i * h2) % this.size));
    }
    return positions;
  }

  #setBit(pos) {
    this.bits[Math.floor(pos / 8)] |= 1 << pos % 8;
  }

  #getBit(pos) {
    return (this.bits[Math.floor(pos / 8)] >> pos % 8) & 1;
  }

  /**
   * Record that an item has been seen.
   * @param {string|Buffer} item - Content hash of a chunk
   */
  add(item) {
    for (const pos of this.#hashes(item)) {
      this.#setBit(pos);
    }
  }

  /**
   * Check if an item might have been seen before.
   * @param {string|Buffer} item
   * @returns {boolean} false = definitely NOT seen; true = PROBABLY seen (confirm via DB)
   */
  mightContain(item) {
    return this.#hashes(item).every((pos) => this.#getBit(pos) === 1);
  }
}

export default BloomFilter;
