import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema(
  {
    bucketId: { type: mongoose.Schema.Types.ObjectId, ref: "Bucket", required: true },
    key: { type: String, required: true },       // Object key in the bucket
    order: { type: Number, required: true },     // Reassembly order (0-indexed)
    hash: { type: String, required: true },      // Content hash for integrity (Merkle leaf)
    sizeBytes: { type: Number, required: true },
  },
  { _id: false } // Chunks are embedded, not top-level documents
);

const fileSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, "Filename is required"],
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: [true, "File size is required"],
      min: 0,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null, // null = root level
    },

    // For non-chunked files
    isChunked: {
      type: Boolean,
      default: false,
    },
    bucketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bucket",
      default: null, // Used when isChunked = false
    },
    key: {
      type: String,
      default: null, // Object key in the bucket; used when isChunked = false
    },

    // For chunked files (large files split across multiple buckets)
    chunks: {
      type: [chunkSchema],
      default: [],
    },

    // SHA-256 content hash — used by the deduplication system
    contentHash: {
      type: String,
      default: null,
    },

    // Merkle root hash — used to verify chunk integrity without re-downloading
    merkleRoot: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes — queried on every file list and search request
fileSchema.index({ ownerId: 1, folderId: 1 });
fileSchema.index({ ownerId: 1, filename: 1 });
fileSchema.index({ contentHash: 1 }); // Dedup lookups

const File = mongoose.model("File", fileSchema);
export default File;
