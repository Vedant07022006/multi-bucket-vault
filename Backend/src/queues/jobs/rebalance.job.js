import { rebalanceQueue } from "../queue.config.js";
import logger from "../../utils/logger.js";

/**
 * Adds a rebalance job to the queue.
 * Called by the "bucket:nearFull" event subscriber in server.js.
 *
 * Keeping job-specific config (deduplication, delay) here — not in bucket.service.js —
 * prevents queue concerns from leaking into business logic.
 *
 * @param {{ bucketId: string }} data
 */
export const addRebalanceJob = async (data) => {
  await rebalanceQueue.add("rebalance", data, {
    // Deduplicate: don't add another job if one for the same bucket is already queued
    jobId: `rebalance:${data.bucketId}`,
    delay: 5000, // 5-second delay to batch rapid successive near-full events
  });
  logger.info(`[RebalanceJob] Queued rebalance for bucket: ${data.bucketId}`);
};
