import * as bucketRepository from "../bucket/bucket.repository.js";
import * as fileRepository from "../file/file.repository.js";
import s3Adapter from "../bucket/adapters/s3CompatibleAdapter.js";
import MinHeap from "../../algorithms/minHeap.js";
import ApiError from "../../utils/ApiError.js";
import config from "../../config/env.config.js";
import logger from "../../utils/logger.js";
import { randomUUID } from "crypto";

/**
 * Find all active buckets currently above the rebalance usage threshold.
 * @returns {Promise<import('mongoose').Document[]>}
 */
export const findBucketsNeedingRebalance = async () => {
  const buckets = await bucketRepository.findActive();
  return buckets.filter(
    (b) => b.usedBytes / b.capacityBytes >= config.rebalanceThreshold
  );
};

/**
 * Select which files to migrate out of a full bucket, prioritizing by largest size first.
 * Uses a Min-Heap (priority queue) keyed on file size descending — migrating larger files
 * first frees the most space with the fewest operations.
 *
 * @param {string} bucketId - The overloaded bucket
 * @param {number} [limit=10] - Max files to return
 * @returns {Promise<import('mongoose').Document[]>}
 */
export const selectFilesToMigrate = async (bucketId, limit = 10) => {
  const files = await fileRepository.findByOwner(null, null); // All files
  const bucketFiles = files.filter(
    (f) => !f.isChunked && f.bucketId?.toString() === bucketId
  );

  // Max-heap by size (negate for min-heap to act as max-heap)
  const heap = new MinHeap((a, b) => b.size - a.size);
  for (const file of bucketFiles) heap.insert(file);

  const candidates = [];
  while (!heap.isEmpty() && candidates.length < limit) {
    candidates.push(heap.extractMin());
  }
  return candidates;
};

/**
 * Copy a file from its current bucket to a target bucket, update metadata,
 * then delete the original copy.
 *
 * @param {string} fileId
 * @param {string} targetBucketId
 */
export const migrateFile = async (fileId, targetBucketId) => {
  const file = await fileRepository.findById(fileId);
  if (!file) throw new ApiError(404, `File ${fileId} not found for migration.`);
  if (file.isChunked) {
    logger.warn(`Skipping migration of chunked file ${fileId} — not yet supported.`);
    return;
  }

  const sourceBucket = await bucketRepository.findById(file.bucketId);
  const targetBucket = await bucketRepository.findById(targetBucketId);
  if (!sourceBucket || !targetBucket) {
    throw new ApiError(500, "Source or target bucket not found during migration.");
  }

  logger.info(`Migrating file ${fileId} from bucket ${file.bucketId} → ${targetBucketId}`);

  // Download from source, re-upload to target with a new key
  const buffer = await s3Adapter.download(sourceBucket, file.key);
  const newKey = `${file.ownerId}/${randomUUID()}`;
  await s3Adapter.upload(targetBucket, newKey, buffer, file.mimeType);

  // Update metadata
  await fileRepository.updateChunkLocation(fileId, 0, targetBucketId, newKey);

  // Update usage on both buckets
  await bucketRepository.updateUsage(file.bucketId.toString(), -file.size);
  await bucketRepository.updateUsage(targetBucketId, file.size);

  // Delete original
  await s3Adapter.delete(sourceBucket, file.key);
  logger.info(`Migration of file ${fileId} complete.`);
};
