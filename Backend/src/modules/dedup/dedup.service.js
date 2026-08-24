import crypto from "crypto";
import BloomFilter from "../../algorithms/bloomFilter.js";
import { findDuplicateLocation } from "./dedup.repository.js";

/**
 * Dedup Service
 *
 * Two-stage deduplication:
 *  1. Bloom filter (fast, in-memory) — eliminates obviously-new content without DB I/O.
 *  2. Real DB lookup — confirms "maybe seen" cases from the Bloom filter.
 *
 * A false positive rate of ~1% on the Bloom filter is acceptable —
 * it means ~1% of unique chunks trigger an unnecessary DB lookup (fast).
 * False negatives cannot happen — unique content is always stored.
 */

// Shared Bloom filter instance — persists across requests in the same process.
// In production with multiple Node instances, this would be backed by Redis bitfield.
const bloomFilter = new BloomFilter(10_000_000, 7); // ~10M items, 7 hash functions

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

/**
 * Check whether a chunk is a duplicate of already-stored content.
 *
 * @param {Buffer} chunkBuffer - Raw chunk bytes
 * @param {string} [precomputedHash] - SHA-256 hex if already computed upstream
 * @returns {Promise<{ isDuplicate: boolean, existingLocation: { bucketId, key }|null }>}
 */
export const checkDuplicate = async (chunkBuffer, precomputedHash = null) => {
  const hash = precomputedHash ?? sha256(chunkBuffer);

  // Stage 1: Bloom filter fast-path
  if (!bloomFilter.mightContain(hash)) {
    // Definitely NOT a duplicate — add to filter and return immediately
    bloomFilter.add(hash);
    return { isDuplicate: false, existingLocation: null };
  }

  // Stage 2: Confirm via real DB lookup (Bloom said "maybe")
  const existingLocation = await findDuplicateLocation(hash);

  if (existingLocation) {
    return { isDuplicate: true, existingLocation };
  }

  // False positive — the Bloom filter was wrong; this is new content
  bloomFilter.add(hash);
  return { isDuplicate: false, existingLocation: null };
};
