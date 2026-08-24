/**
 * Builder Pattern — FileMetadataBuilder
 *
 * Constructs the metadata object passed to file.repository.create().
 * Using a builder avoids the anti-pattern of a large constructor call with
 * many positional arguments or a partially populated object literal.
 *
 * All optional fields have sensible defaults; only required fields throw if missing.
 */
class FileMetadataBuilder {
  constructor() {
    this._data = {
      isChunked: false,
      chunks: [],
      folderId: null,
      contentHash: null,
      merkleRoot: null,
      bucketId: null,
      key: null,
    };
  }

  setFilename(filename) {
    this._data.filename = filename;
    return this;
  }

  setOriginalName(originalName) {
    this._data.originalName = originalName;
    return this;
  }

  setMimeType(mimeType) {
    this._data.mimeType = mimeType;
    return this;
  }

  setSize(size) {
    this._data.size = size;
    return this;
  }

  setOwner(ownerId) {
    this._data.ownerId = ownerId;
    return this;
  }

  setFolder(folderId) {
    this._data.folderId = folderId ?? null;
    return this;
  }

  /** For non-chunked files: set the single bucket and key. */
  setBucket(bucketId, key) {
    this._data.bucketId = bucketId;
    this._data.key = key;
    this._data.isChunked = false;
    return this;
  }

  /**
   * For chunked files: provide the full chunks array.
   * Each chunk: { bucketId, key, order, hash, sizeBytes }
   */
  setChunks(chunks) {
    this._data.chunks = chunks;
    this._data.isChunked = chunks.length > 0;
    return this;
  }

  setContentHash(hash) {
    this._data.contentHash = hash;
    return this;
  }

  setMerkleRoot(root) {
    this._data.merkleRoot = root;
    return this;
  }

  /**
   * Return the final plain object ready for file.repository.create().
   * Throws if any required field is missing.
   */
  build() {
    const required = ["filename", "originalName", "mimeType", "size", "ownerId"];
    for (const field of required) {
      if (!this._data[field] && this._data[field] !== 0) {
        throw new Error(`FileMetadataBuilder: missing required field '${field}'.`);
      }
    }
    return { ...this._data };
  }
}

export default FileMetadataBuilder;
