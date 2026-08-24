/**
 * Strategy Pattern — Abstract Base for Bucket Selection Strategies
 *
 * bucket.service.js holds a reference to the active strategy and delegates
 * all selection logic to it — the service never implements selection itself.
 * Swapping strategies (bestFit ↔ leastUsed) requires only changing the
 * BUCKET_STRATEGY env var, not any logic.
 */
class BinPackingStrategyBase {
  /**
   * Select the best bucket for a file/chunk of the given size.
   * @param {Array<import('mongoose').Document>} buckets - Active bucket documents
   * @param {number} fileSize - File/chunk size in bytes
   * @returns {import('mongoose').Document|null} Selected bucket, or null if none fit
   */
  // eslint-disable-next-line no-unused-vars
  selectBucket(buckets, fileSize) {
    throw new Error("BinPackingStrategyBase.selectBucket() must be implemented by subclass.");
  }
}

export default BinPackingStrategyBase;
