import { dedupScanQueue } from "../queue.config.js";
import logger from "../../utils/logger.js";

/**
 * Adds a dedup scan job to the queue.
 * Can be scheduled periodically (e.g. nightly cron) to find files
 * whose content matches but were uploaded before dedup was active.
 *
 * @param {{ ownerId?: string }} [data] - Optional scope to a specific user
 */
export const addDedupScanJob = async (data = {}) => {
  await dedupScanQueue.add("dedup-scan", data, {
    jobId: `dedup-scan:${data.ownerId ?? "all"}`,
  });
  logger.info(`[DedupScanJob] Queued dedup scan. Scope: ${data.ownerId ?? "all users"}`);
};
