import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import StorageAdapterBase from "./storageAdapter.base.js";
import StorageClientFactory from "../../../config/storage/storageClient.factory.js";
import generatePresignedUrl from "../../../utils/generatePresignedUrl.js";

/**
 * Adapter Pattern — S3-Compatible Storage Adapter
 *
 * Implements the StorageAdapterBase contract using the AWS SDK v3.
 * Works unchanged against MinIO (local), Cloudflare R2, Backblaze B2, or AWS S3
 * because all speak the same S3-compatible API.
 *
 * This is the ONLY file in the codebase that knows about S3 commands.
 */
class S3CompatibleAdapter extends StorageAdapterBase {
  /**
   * Build an S3Client from the bucket document's credentials.
   * secretAccessKey is decrypted here via the model's instance method.
   */
  #buildClient(bucketDoc) {
    return StorageClientFactory.create({
      endpoint: bucketDoc.endpoint,
      region: bucketDoc.region,
      accessKeyId: bucketDoc.accessKeyId,
      secretAccessKey: bucketDoc.getDecryptedSecret(), // AES decryption inside model
    });
  }

  /**
   * Upload a Buffer directly to the bucket.
   * Used internally by the rebalance worker when copying files between buckets.
   * For normal uploads, the browser uses a pre-signed URL instead.
   */
  async upload(bucketDoc, key, buffer, mimeType = "application/octet-stream") {
    const client = this.#buildClient(bucketDoc);
    await client.send(
      new PutObjectCommand({
        Bucket: bucketDoc.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ContentLength: buffer.length,
      })
    );
  }

  /**
   * Download an object and return it as a Buffer.
   * Used when reassembling chunked files server-side before streaming to client.
   */
  async download(bucketDoc, key) {
    const client = this.#buildClient(bucketDoc);
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucketDoc.bucketName, Key: key })
    );

    // Collect the readable stream into a Buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /** Delete an object from the bucket. */
  async delete(bucketDoc, key) {
    const client = this.#buildClient(bucketDoc);
    await client.send(
      new DeleteObjectCommand({ Bucket: bucketDoc.bucketName, Key: key })
    );
  }

  /**
   * Generate a short-lived pre-signed URL so the browser can upload/download
   * directly to the bucket — bytes never pass through this Express server.
   * @param {'upload'|'download'} operation
   */
  async generatePresignedUrl(bucketDoc, key, operation) {
    const client = this.#buildClient(bucketDoc);
    return generatePresignedUrl(client, bucketDoc.bucketName, key, operation);
  }
}

// Export a singleton instance — all callers share one adapter object
const s3Adapter = new S3CompatibleAdapter();
export default s3Adapter;
