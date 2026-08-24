import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import config from "../config/env.config.js";

/**
 * Generates a pre-signed URL for either uploading (PUT) or downloading (GET).
 *
 * Pre-signed URLs allow the browser to transfer files DIRECTLY to/from the bucket
 * without the bytes ever passing through this Express server (edge offloading).
 *
 * @param {import('@aws-sdk/client-s3').S3Client} s3Client
 * @param {string} bucketName - The bucket name on the provider
 * @param {string} key - The object key within the bucket
 * @param {'upload'|'download'} operation
 * @param {number} [expiresIn] - URL lifetime in seconds (default from config)
 * @returns {Promise<string>} The pre-signed URL
 */
const generatePresignedUrl = async (
  s3Client,
  bucketName,
  key,
  operation,
  expiresIn = config.presignedUrlExpirySeconds
) => {
  const Command =
    operation === "upload"
      ? new PutObjectCommand({ Bucket: bucketName, Key: key })
      : new GetObjectCommand({ Bucket: bucketName, Key: key });

  return getSignedUrl(s3Client, Command, { expiresIn });
};

export default generatePresignedUrl;
