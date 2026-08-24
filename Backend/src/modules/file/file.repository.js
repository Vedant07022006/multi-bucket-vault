import File from "./file.model.js";

/**
 * Repository/DAO Pattern — file.repository.js
 * Only Mongoose queries. No business logic.
 */

/** @param {Object} fileData - Pre-built metadata object from file.builder.js */
export const create = (fileData) => File.create(fileData);

/** @param {string} fileId */
export const findById = (fileId) => File.findById(fileId);

/**
 * List all files owned by a user, optionally scoped to a folder.
 * @param {string} ownerId
 * @param {string|null} [folderId] - null = root-level files
 */
export const findByOwner = (ownerId, folderId = null) =>
  File.find({ ownerId, folderId }).sort({ createdAt: -1 });

/** @param {string} fileId */
export const deleteById = (fileId) => File.findByIdAndDelete(fileId);

/**
 * Update the bucket and key of a single chunk — used by rebalance.service
 * when migrating a chunk from one bucket to another.
 * @param {string} fileId
 * @param {number} chunkOrder - 0-based chunk order index
 * @param {string} newBucketId
 * @param {string} newKey
 */
export const updateChunkLocation = (fileId, chunkOrder, newBucketId, newKey) =>
  File.findOneAndUpdate(
    { _id: fileId, "chunks.order": chunkOrder },
    {
      $set: {
        "chunks.$.bucketId": newBucketId,
        "chunks.$.key": newKey,
      },
    },
    { new: true }
  );

/**
 * Look up a file by its SHA-256 content hash — used by dedup.repository.
 * @param {string} hash
 */
export const findByContentHash = (hash) => File.findOne({ contentHash: hash });

/**
 * Total bytes stored by a user — for user profile storage stats.
 * @param {string} ownerId
 * @returns {Promise<number>}
 */
export const sumStorageByOwner = async (ownerId) => {
  const result = await File.aggregate([
    { $match: { ownerId: ownerId } },
    { $group: { _id: null, totalBytes: { $sum: "$size" } } },
  ]);
  return result[0]?.totalBytes ?? 0;
};
