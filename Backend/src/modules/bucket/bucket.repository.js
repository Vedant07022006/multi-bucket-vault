import Bucket from "./bucket.model.js";

/**
 * Repository/DAO Pattern — bucket.repository.js
 * Only Mongoose queries. No business logic.
 */

/** @returns {Promise<import('mongoose').Document[]>} All buckets */
export const findAll = () => Bucket.find();

/** @returns {Promise<import('mongoose').Document[]>} Only active buckets */
export const findActive = () => Bucket.find({ status: "active" });

/** @param {string} id */
export const findById = (id) => Bucket.findById(id);

/**
 * Register a new bucket.
 * @param {Object} bucketData
 */
export const create = (bucketData) => Bucket.create(bucketData);

/**
 * Atomically adjust usedBytes by a delta (positive = adding data, negative = removing).
 * Uses $inc to avoid read-modify-write race conditions.
 * @param {string} bucketId
 * @param {number} deltaBytes - Can be negative (file deleted/migrated out)
 */
export const updateUsage = (bucketId, deltaBytes) =>
  Bucket.findByIdAndUpdate(
    bucketId,
    { $inc: { usedBytes: deltaBytes } },
    { new: true }
  );

/**
 * Update the operational status of a bucket.
 * @param {string} bucketId
 * @param {'active'|'full'|'offline'} status
 */
export const updateStatus = (bucketId, status) =>
  Bucket.findByIdAndUpdate(bucketId, { status }, { new: true });

/** Delete a bucket record by ID (admin only, use with care). */
export const deleteById = (bucketId) => Bucket.findByIdAndDelete(bucketId);
