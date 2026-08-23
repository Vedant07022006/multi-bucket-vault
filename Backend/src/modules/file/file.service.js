import ValidateStep from "./pipeline/validateStep.js";
import ChunkStep from "./pipeline/chunkStep.js";
import DedupCheckStep from "./pipeline/dedupCheckStep.js";
import BinPackStep from "./pipeline/binPackStep.js";
import UploadToBucketStep from "./pipeline/uploadToBucketStep.js";
import SaveMetadataStep from "./pipeline/saveMetadataStep.js";
import * as fileRepository from "./file.repository.js";
import s3Adapter from "../bucket/adapters/s3CompatibleAdapter.js";
import * as bucketService from "../bucket/bucket.service.js";
import * as bucketRepository from "../bucket/bucket.repository.js";
import { generateProof, verifyChunk } from "../../algorithms/merkleTree.js";
import ApiError from "../../utils/ApiError.js";

// ─── Build the upload pipeline once (Chain of Responsibility) ─────────────────
const validateStep = new ValidateStep();
const chunkStep = new ChunkStep();
const dedupCheckStep = new DedupCheckStep();
const binPackStep = new BinPackStep();
const uploadToBucketStep = new UploadToBucketStep();
const saveMetadataStep = new SaveMetadataStep();

// Wire the chain: validate → chunk → dedup → binpack → upload → save
validateStep.setNext(chunkStep)
  .setNext(dedupCheckStep)
  .setNext(binPackStep)
  .setNext(uploadToBucketStep)
  .setNext(saveMetadataStep);

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Initiate an upload by running the full pipeline.
 * Returns pre-signed URLs for the browser to upload bytes directly to buckets.
 *
 * @param {Object} file - Multer file object { buffer, originalname, mimetype, size }
 * @param {string} ownerId
 * @param {string|null} [folderId]
 * @returns {Promise<{ file: Object, presignedUrls: Array }>}
 */
export const initiateUpload = async (file, ownerId, folderId = null) => {
  const context = { file, ownerId, folderId, error: null };

  await validateStep.handle(context);

  if (context.error) throw context.error;

  return {
    file: context.savedFile,
    presignedUrls: context.presignedUrls,
  };
};

/**
 * Generate pre-signed download URL(s) for a file.
 * For chunked files: one URL per chunk so the browser can fetch in parallel.
 * For single-bucket files: one URL.
 *
 * @param {string} fileId
 * @param {string} requestingUserId
 */
export const getDownloadUrls = async (fileId, requestingUserId) => {
  const file = await fileRepository.findById(fileId);
  if (!file) throw new ApiError(404, "File not found.");
  if (file.ownerId.toString() !== requestingUserId) {
    throw new ApiError(403, "You do not have permission to access this file.");
  }

  if (file.isChunked) {
    // Generate one pre-signed GET URL per chunk (browser fetches in parallel)
    const urls = await Promise.all(
      [...file.chunks].sort((a, b) => a.order - b.order).map(async (chunk) => {
        const bucketDoc = await bucketRepository.findById(chunk.bucketId);
        if (!bucketDoc) throw new ApiError(500, `Bucket ${chunk.bucketId} not found.`);
        const url = await s3Adapter.generatePresignedUrl(bucketDoc, chunk.key, "download");
        return { order: chunk.order, url, hash: chunk.hash, sizeBytes: chunk.sizeBytes };
      })
    );

    return {
      filename: file.filename,
      isChunked: true,
      merkleRoot: file.merkleRoot,
      chunks: urls,
    };
  } else {
    const bucketDoc = await bucketRepository.findById(file.bucketId);
    if (!bucketDoc) throw new ApiError(500, "Storage bucket not found.");
    const url = await s3Adapter.generatePresignedUrl(bucketDoc, file.key, "download");
    return { filename: file.filename, isChunked: false, url };
  }
};

/**
 * Delete a file — removes from bucket(s) and deletes the metadata record.
 * @param {string} fileId
 * @param {string} requestingUserId
 */
export const deleteFile = async (fileId, requestingUserId) => {
  const file = await fileRepository.findById(fileId);
  if (!file) throw new ApiError(404, "File not found.");
  if (file.ownerId.toString() !== requestingUserId) {
    throw new ApiError(403, "You do not have permission to delete this file.");
  }

  if (file.isChunked) {
    await Promise.all(
      file.chunks.map(async (chunk) => {
        const bucketDoc = await bucketRepository.findById(chunk.bucketId);
        if (bucketDoc) {
          await s3Adapter.delete(bucketDoc, chunk.key);
          await bucketService.updateBucketUsage(chunk.bucketId.toString(), -chunk.sizeBytes);
        }
      })
    );
  } else {
    const bucketDoc = await bucketRepository.findById(file.bucketId);
    if (bucketDoc) {
      await s3Adapter.delete(bucketDoc, file.key);
      await bucketService.updateBucketUsage(file.bucketId.toString(), -file.size);
    }
  }

  await fileRepository.deleteById(fileId);
};

/**
 * List all files owned by a user (optionally scoped to a folder).
 * @param {string} ownerId
 * @param {string|null} [folderId]
 */
export const listFiles = (ownerId, folderId = null) =>
  fileRepository.findByOwner(ownerId, folderId);
