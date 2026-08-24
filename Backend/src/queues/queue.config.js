import { Queue } from "bullmq";
import getRedisClient from "../config/redis.config.js";

/**
 * BullMQ queue instances shared across the application.
 * Workers (separate processes) pull from these queues.
 */

const redisClient = getRedisClient();

/**
 * Queue for bucket rebalance jobs.
 * Produced by: bucketEvents "bucket:nearFull" subscriber in server.js
 * Consumed by: rebalance.worker.js
 */
export const rebalanceQueue = new Queue("rebalance-jobs", {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 }, // 5s, 10s, 20s
    removeOnComplete: 100, // Keep last 100 completed jobs for debugging
    removeOnFail: 50,
  },
});

/**
 * Queue for deduplication scan jobs (full-file dedup sweep, run on a schedule).
 * Consumed by: dedupScan.job.js
 */
export const dedupScanQueue = new Queue("dedup-scan-jobs", {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: 20,
    removeOnFail: 20,
  },
});
