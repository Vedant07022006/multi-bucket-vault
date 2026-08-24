import BinPackingStrategyBase from "./binPackingStrategy.base.js";
import { bestFit } from "../../../algorithms/binPacking.js";

/**
 * Strategy Pattern — Best-Fit Strategy
 *
 * Picks the bucket with the LEAST remaining free space that can still fit
 * the file. This minimizes internal fragmentation — analogous to best-fit
 * memory allocation. Good for maximizing space utilization across all buckets.
 */
class BestFitStrategy extends BinPackingStrategyBase {
  selectBucket(buckets, fileSize) {
    return bestFit(buckets, fileSize);
  }
}

export default new BestFitStrategy();
