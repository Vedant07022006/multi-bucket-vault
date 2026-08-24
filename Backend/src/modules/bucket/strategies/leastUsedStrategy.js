import BinPackingStrategyBase from "./binPackingStrategy.base.js";
import { leastUsed } from "../../../algorithms/binPacking.js";

/**
 * Strategy Pattern — Least-Used Strategy
 *
 * Picks the bucket with the lowest overall usage percentage.
 * Good for even distribution across buckets rather than filling one at a time.
 */
class LeastUsedStrategy extends BinPackingStrategyBase {
  selectBucket(buckets, fileSize) {
    return leastUsed(buckets, fileSize);
  }
}

export default new LeastUsedStrategy();
