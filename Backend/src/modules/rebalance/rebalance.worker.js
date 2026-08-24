import { Worker } from "bullmq";
import {
  findBucketsNeedingRebalance,
  selectFilesToMigrate,
  migrateFile,
} from "./rebalance.service.js";
import * as bucketRepository from "../bucket/bucket.repository.js";
import logger from "../../utils/logger.js";
import getRedisClient from "../../config/redis.config.js";

/**
 * BullMQ Worker — Rebalance Worker
 *
 * Runs as a separate long-lived process (or separate Docker service).
 * Listens on the "rebalance-jobs" queue and processes rebalance job payloads.
 *
 * Keeping this separate from the API process ensures that a slow rebalance
 * operation never blocks or slows down API request handling.
 */
const startRebalanceWorker = () => {
  const redisClient = getRedisClient();

  const worker = new Worker(
    "rebalance-jobs",
    async (job) => {
      const { bucketId } = job.data;
      logger.info(`[RebalanceWorker] Processing rebalance job for bucket: ${bucketId}`);

      // Find a target bucket with the most free space
      const allBuckets = await bucketRepository.findActive();
      const targetBucket = allBuckets
        .filter((b) => b._id.toString() !== bucketId)
        .sort((a, b) => b.freeBytes - a.freeBytes)[0];

      if (!targetBucket) {
        logger.warn(`[RebalanceWorker] No target bucket available for rebalance.`);
        return;
      }

      const filesToMove = await selectFilesToMigrate(bucketId, 10);

      let migrated = 0;
      for (const file of filesToMove) {
        if (file.size > targetBucket.freeBytes) continue; // Skip if target can't fit it
        await migrateFile(file._id.toString(), targetBucket._id.toString());
        migrated++;
      }

      logger.info(`[RebalanceWorker] Migrated ${migrated} files from bucket ${bucketId}.`);
    },
    {
      connection: redisClient,
      // Retry failed jobs up to 3 times with exponential backoff
      settings: { maxStalledCount: 3 },
    }
  );

  worker.on("completed", (job) =>
    logger.info(`[RebalanceWorker] Job ${job.id} completed.`)
  );
  worker.on("failed", (job, err) =>
    logger.error(`[RebalanceWorker] Job ${job?.id} failed:`, err.message)
  );

  logger.info("[RebalanceWorker] Listening on queue: rebalance-jobs");
  return worker;
};

export default startRebalanceWorker;
