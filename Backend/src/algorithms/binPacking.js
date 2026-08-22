/**
 * Bin Packing Algorithms
 *
 * Used by bucket selection strategies to decide which registered bucket
 * should receive a new file or chunk.
 *
 * These are pure functions — no DB, no Express, no side effects.
 * Independently unit-testable.
 */

/**
 * Best-Fit strategy: pick the bucket with the LEAST remaining free space
 * that can still fit the file. Minimizes wasted space — analogous to
 * best-fit bin packing in memory allocation.
 *
 * @param {Array<{_id: string, freeBytes: number, status: string}>} buckets
 * @param {number} fileSize - File size in bytes
 * @returns {Object|null} The selected bucket, or null if none fit
 */
export const bestFit = (buckets, fileSize) => {
  let best = null;

  for (const bucket of buckets) {
    if (bucket.status !== "active") continue;
    if (bucket.freeBytes < fileSize) continue;

    // Keep the bucket with the smallest free space that still fits
    if (best === null || bucket.freeBytes < best.freeBytes) {
      best = bucket;
    }
  }

  return best;
};

/**
 * Least-Used strategy: pick the bucket with the lowest usage percentage.
 * Distributes files evenly across buckets rather than filling one at a time.
 *
 * @param {Array<{_id: string, freeBytes: number, usageFraction: number, status: string}>} buckets
 * @param {number} fileSize
 * @returns {Object|null}
 */
export const leastUsed = (buckets, fileSize) => {
  let best = null;

  for (const bucket of buckets) {
    if (bucket.status !== "active") continue;
    if (bucket.freeBytes < fileSize) continue;

    if (best === null || bucket.usageFraction < best.usageFraction) {
      best = bucket;
    }
  }

  return best;
};

/**
 * First-Fit Decreasing (FFD): sorts items by size descending, then assigns
 * each to the first bucket that fits. Useful for batch placement decisions
 * (e.g. migrating multiple files during rebalance).
 *
 * @param {Array<{id: string, size: number}>} items - Items to place
 * @param {Array<{_id: string, freeBytes: number, status: string}>} buckets
 * @returns {Map<string, string>} Map of item.id → bucket._id
 */
export const firstFitDecreasing = (items, buckets) => {
  const sorted = [...items].sort((a, b) => b.size - a.size);
  const remaining = new Map(buckets.map((b) => [b._id.toString(), b.freeBytes]));
  const assignment = new Map();

  for (const item of sorted) {
    for (const [bucketId, free] of remaining) {
      const bucket = buckets.find((b) => b._id.toString() === bucketId);
      if (bucket?.status !== "active") continue;
      if (free >= item.size) {
        assignment.set(item.id, bucketId);
        remaining.set(bucketId, free - item.size);
        break;
      }
    }
    // If no bucket fits, item.id won't be in the map — caller handles this case
  }

  return assignment;
};
