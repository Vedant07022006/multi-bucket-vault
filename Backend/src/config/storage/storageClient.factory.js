import { S3Client } from "@aws-sdk/client-s3";

/**
 * Factory Pattern — the ONLY place in the codebase that constructs an S3Client.
 *
 * Accepts a bucket config document from MongoDB and returns a configured S3Client.
 * Works unchanged against MinIO (local), Cloudflare R2, Backblaze B2, or AWS S3
 * because all speak the same S3-compatible API — only the config values differ.
 */
class StorageClientFactory {
  /**
   * @param {Object} bucketConfig - A bucket document from MongoDB
   * @param {string} bucketConfig.endpoint - e.g. "http://localhost:9000" for MinIO
   * @param {string} bucketConfig.region - e.g. "us-east-1"
   * @param {string} bucketConfig.accessKeyId - Decrypted access key
   * @param {string} bucketConfig.secretAccessKey - Decrypted secret key
   * @returns {S3Client}
   */
  static create({ endpoint, region, accessKeyId, secretAccessKey }) {
    return new S3Client({
      endpoint,
      region: region || "us-east-1",
      credentials: { accessKeyId, secretAccessKey },
      // Required for path-style URLs used by MinIO (e.g. http://localhost:9000/bucket/key)
      // instead of virtual-hosted style (bucket.s3.amazonaws.com/key)
      forcePathStyle: true,
    });
  }
}

export default StorageClientFactory;
