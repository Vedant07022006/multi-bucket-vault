/**
 * Adapter Pattern — Abstract Base for Storage Adapters
 *
 * Defines the uniform interface that file.service.js uses to interact with
 * any storage provider. The service never imports an AWS SDK command directly —
 * it only calls these methods, which shields it from provider-specific details.
 *
 * Implementors: s3CompatibleAdapter.js
 */
class StorageAdapterBase {
  /**
   * Upload a Buffer to a bucket.
   * @param {Object} bucketDoc - Full Mongoose Bucket document (includes credentials)
   * @param {string} key - Object key (path within the bucket)
   * @param {Buffer} buffer - File/chunk bytes
   * @param {string} [mimeType]
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async upload(bucketDoc, key, buffer, mimeType) {
    throw new Error("StorageAdapterBase.upload() must be implemented by subclass.");
  }

  /**
   * Download an object from a bucket.
   * @param {Object} bucketDoc
   * @param {string} key
   * @returns {Promise<Buffer>}
   */
  // eslint-disable-next-line no-unused-vars
  async download(bucketDoc, key) {
    throw new Error("StorageAdapterBase.download() must be implemented by subclass.");
  }

  /**
   * Delete an object from a bucket.
   * @param {Object} bucketDoc
   * @param {string} key
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async delete(bucketDoc, key) {
    throw new Error("StorageAdapterBase.delete() must be implemented by subclass.");
  }

  /**
   * Generate a pre-signed URL for direct browser-to-bucket transfer.
   * @param {Object} bucketDoc
   * @param {string} key
   * @param {'upload'|'download'} operation
   * @returns {Promise<string>} Pre-signed URL
   */
  // eslint-disable-next-line no-unused-vars
  async generatePresignedUrl(bucketDoc, key, operation) {
    throw new Error(
      "StorageAdapterBase.generatePresignedUrl() must be implemented by subclass."
    );
  }
}

export default StorageAdapterBase;
