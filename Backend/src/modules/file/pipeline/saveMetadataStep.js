import crypto from "crypto";
import UploadStepBase from "./uploadStep.base.js";
import FileMetadataBuilder from "../file.builder.js";
import * as fileRepository from "../file.repository.js";
import { buildTree } from "../../../algorithms/merkleTree.js";
import * as bucketService from "../../bucket/bucket.service.js";

/**
 * Step 6: Save Metadata
 * Assembles the File document using FileMetadataBuilder (Builder pattern)
 * and persists it via file.repository.
 *
 * Also:
 *  - Builds the Merkle tree from chunk hashes and stores the root.
 *  - Updates each bucket's usedBytes via bucketService.
 *
 * Context mutations:
 *   context.savedFile = newly created File document
 */
class SaveMetadataStep extends UploadStepBase {
  async execute(context) {
    const { file, ownerId, folderId, chunkAssignments, presignedUrls, isChunked } = context;

    const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
    const fileContentHash = sha256(file.buffer);

    const builder = new FileMetadataBuilder()
      .setFilename(file.originalname)
      .setOriginalName(file.originalname)
      .setMimeType(file.mimetype)
      .setSize(file.size)
      .setOwner(ownerId)
      .setFolder(folderId ?? null)
      .setContentHash(fileContentHash);

    if (isChunked) {
      // Build chunk metadata array in order
      const chunksForDB = chunkAssignments.map((a) => ({
        bucketId: a.bucketId,
        key: a.key,
        order: a.order,
        hash: a.hash,
        sizeBytes: a.sizeBytes,
      }));
      builder.setChunks(chunksForDB);

      // Merkle tree over chunk hashes for integrity verification
      const { root } = buildTree(chunksForDB.map((c) => c.hash));
      builder.setMerkleRoot(root);
    } else {
      // Single-bucket file
      const first = presignedUrls[0];
      builder.setBucket(first.bucketId, first.key);
    }

    const fileData = builder.build();
    const savedFile = await fileRepository.create(fileData);
    context.savedFile = savedFile;

    // Update usage on all buckets that received new (non-duplicate) data
    const usageUpdates = new Map(); // bucketId → total bytes added
    for (const a of chunkAssignments) {
      if (!a.skipUpload) {
        usageUpdates.set(a.bucketId, (usageUpdates.get(a.bucketId) ?? 0) + a.sizeBytes);
      }
    }
    await Promise.all(
      [...usageUpdates.entries()].map(([bucketId, bytes]) =>
        bucketService.updateBucketUsage(bucketId, bytes)
      )
    );
  }
}

export default SaveMetadataStep;
