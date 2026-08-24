/**
 * Documents the shape of a bucket config object used throughout the system.
 * In production, real bucket configs live in MongoDB (via the bucket module)
 * so buckets can be added or removed at runtime without redeploying.
 *
 * This file serves as:
 *  1. A reference for the bucket config schema.
 *  2. A seed helper for local development (MinIO instances).
 *
 * Provider types: "minio" | "r2" | "b2" | "s3"
 *
 * @typedef {Object} BucketConfig
 * @property {string} bucketId      - Unique identifier (matches MongoDB bucket._id)
 * @property {string} provider      - Provider type enum
 * @property {string} endpoint      - Base URL, e.g. "http://localhost:9001"
 * @property {string} bucketName    - The actual bucket name on the provider
 * @property {string} region        - Region string, e.g. "us-east-1"
 * @property {string} accessKeyId   - Plain (decrypted) access key — only in memory
 * @property {string} secretAccessKey - Plain (decrypted) secret — only in memory
 * @property {number} capacityBytes - Max capacity in bytes
 * @property {number} usedBytes     - Current usage in bytes
 */

/**
 * Example local MinIO seed configs for development.
 * These mirror what you'd register via POST /api/buckets in the admin panel.
 */
export const DEV_BUCKETS = [
  {
    provider: "minio",
    endpoint: "http://localhost:9001",
    bucketName: "pool-bucket-1",
    region: "us-east-1",
    capacityBytes: 10 * 1024 * 1024 * 1024, // 10 GB
  },
  {
    provider: "minio",
    endpoint: "http://localhost:9002",
    bucketName: "pool-bucket-2",
    region: "us-east-1",
    capacityBytes: 10 * 1024 * 1024 * 1024,
  },
  {
    provider: "minio",
    endpoint: "http://localhost:9003",
    bucketName: "pool-bucket-3",
    region: "us-east-1",
    capacityBytes: 10 * 1024 * 1024 * 1024,
  },
];
