import { findByContentHash } from "../file/file.repository.js";

/**
 * Repository/DAO Pattern — dedup.repository.js
 *
 * Looks up whether a chunk with a given content hash already exists in the system.
 * Returns the bucket/key location if found, so the file record can link to it
 * instead of uploading duplicate bytes.
 */

/**
 * Find an existing file or chunk by its SHA-256 content hash.
 * Returns the storage location (bucketId + key) if a duplicate exists.
 *
 * @param {string} contentHash - SHA-256 hex string
 * @returns {Promise<{ bucketId: string, key: string }|null>}
 */
export const findDuplicateLocation = async (contentHash) => {
  const file = await findByContentHash(contentHash);
  if (!file) return null;

  if (file.isChunked) {
    // For chunked files the hash matches a whole-file hash — not currently used
    // for chunk-level dedup of chunked files (handled per-chunk in pipeline)
    return null;
  }

  return { bucketId: file.bucketId.toString(), key: file.key };
};
