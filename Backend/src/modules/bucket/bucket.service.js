import * as bucketRepository from "./bucket.repository.js";
import bestFitStrategy from "./strategies/bestFitStrategy.js";
import leastUsedStrategy from "./strategies/leastUsedStrategy.js";
import ConsistentHashRing from "../../algorithms/consistentHashing.js";
import bucketEvents from "../../events/bucketEvents.js";
import getRedisClient from "../../config/redis.config.js";
import ApiError from "../../utils/ApiError.js";
import config from "../../config/env.config.js";
import logger from "../../utils/logger.js";

// ─── Strategy selection (configurable via env) ────────────────────────────────
const STRATEGIES = { bestFit: bestFitStrategy, leastUsed: leastUsedStrategy };
const activeStrategy = STRATEGIES[config.bucketStrategy] ?? bestFitStrategy;

const BUCKETS_CACHE_KEY = "cache:buckets:active";
const BUCKETS_CACHE_TTL = 30; // seconds

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Read active buckets from Redis cache, falling back to MongoDB.
 * Keeps hot-path reads (every upload) off the database.
 */
const getActiveBuckets = async () => {
  const redis = getRedisClient();
  const cached = await redis.get(BUCKETS_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const buckets = await bucketRepository.findActive();
  await redis.set(BUCKETS_CACHE_KEY, JSON.stringify(buckets), "EX", BUCKETS_CACHE_TTL);
  return buckets;
};

/** Invalidate the bucket cache so next read re-fetches from MongoDB. */
const invalidateBucketCache = async () => {
  const redis = getRedisClient();
  await redis.del(BUCKETS_CACHE_KEY);
};

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Select the best bucket for a new file/chunk using the active strategy.
 * Emits a "bucket:nearFull" event when a bucket crosses the rebalance threshold.
 *
 * @param {number} fileSize - Size in bytes
 * @returns {Promise<import('mongoose').Document>} The selected bucket document
 */
export const selectBucketForUpload = async (fileSize) => {
  const buckets = await getActiveBuckets();

  const selected = activeStrategy.selectBucket(buckets, fileSize);
  if (!selected) {
    throw new ApiError(
      507,
      "Insufficient storage: no bucket has enough free space for this file."
    );
  }

  // Check if the selected bucket is nearing capacity after this upload
  const projectedUsageFraction =
    (selected.usedBytes + fileSize) / selected.capacityBytes;

  if (projectedUsageFraction >= config.rebalanceThreshold) {
    logger.warn(`Bucket ${selected._id} is nearing capacity (${Math.round(projectedUsageFraction * 100)}%). Emitting rebalance event.`);
    bucketEvents.emit("bucket:nearFull", { bucketId: selected._id.toString() });
  }

  return selected;
};

/**
 * Register a new bucket — admin action.
 * Persists to MongoDB, invalidates the cache, and adds the bucket to the
 * consistent hash ring so future chunk assignments can use it.
 *
 * @param {Object} bucketData
 */
export const registerBucket = async (bucketData) => {
  const bucket = await bucketRepository.create(bucketData);

  // Add to the consistent hash ring (Singleton)
  const ring = ConsistentHashRing.getInstance();
  ring.addBucket(bucket._id.toString());

  await invalidateBucketCache();
  logger.info(`Bucket registered: ${bucket._id} (${bucket.provider} @ ${bucket.endpoint})`);
  return bucket;
};

/**
 * Increment/decrement a bucket's usedBytes after an upload/delete.
 * Also updates the bucket status if it becomes full.
 * @param {string} bucketId
 * @param {number} deltaBytes - Positive for upload, negative for delete
 */
export const updateBucketUsage = async (bucketId, deltaBytes) => {
  const updated = await bucketRepository.updateUsage(bucketId, deltaBytes);
  if (!updated) throw new ApiError(404, "Bucket not found.");

  // Mark full if at or over capacity
  if (updated.usedBytes >= updated.capacityBytes && updated.status === "active") {
    await bucketRepository.updateStatus(bucketId, "full");
    logger.warn(`Bucket ${bucketId} marked as FULL.`);
  } else if (updated.usedBytes < updated.capacityBytes && updated.status === "full") {
    // Re-activate if space freed up (e.g. after rebalancing)
    await bucketRepository.updateStatus(bucketId, "active");
  }

  await invalidateBucketCache();
  return updated;
};

/**
 * Return usage summary for the admin dashboard.
 * Total capacity, total used, per-bucket breakdown.
 */
export const getBucketUsageSummary = async () => {
  const buckets = await bucketRepository.findAll();

  const totalCapacity = buckets.reduce((sum, b) => sum + b.capacityBytes, 0);
  const totalUsed = buckets.reduce((sum, b) => sum + b.usedBytes, 0);

  return {
    totalCapacityBytes: totalCapacity,
    totalUsedBytes: totalUsed,
    totalFreeBytes: totalCapacity - totalUsed,
    usagePercent: totalCapacity > 0 ? ((totalUsed / totalCapacity) * 100).toFixed(2) : 0,
    buckets: buckets.map((b) => ({
      _id: b._id,
      provider: b.provider,
      endpoint: b.endpoint,
      bucketName: b.bucketName,
      status: b.status,
      capacityBytes: b.capacityBytes,
      usedBytes: b.usedBytes,
      freeBytes: b.freeBytes,
      usagePercent: ((b.usedBytes / b.capacityBytes) * 100).toFixed(2),
    })),
  };
};

export const getBucketById = (id) => bucketRepository.findById(id);
export const getAllBuckets = () => bucketRepository.findAll();
