import UploadStepBase from "./uploadStep.base.js";
import * as dedupService from "../../dedup/dedup.service.js";

/**
 * Step 3: Dedup Check
 * For each chunk (or the whole file if not chunked), checks whether identical
 * content has already been stored.
 *
 * Pipeline:
 *   1. Check Bloom filter (fast, in-memory) — "definitely not seen" skips DB.
 *   2. If Bloom says "maybe", confirm via dedup.repository DB lookup.
 *   3. Mark duplicate chunks with skipUpload: true and record existingLocation
 *      so saveMetadataStep can link to the existing bucket/key instead of re-uploading.
 *
 * Context mutations:
 *   context.chunkAssignments = [{ data, hash, sizeBytes, order, skipUpload, existingLocation }]
 */
class DedupCheckStep extends UploadStepBase {
  async execute(context) {
    const { file, chunks, isChunked } = context;

    // Build a unified list of items to dedup-check
    const items = isChunked
      ? chunks.map((c, i) => ({ ...c, order: i }))
      : [{ data: file.buffer, hash: context.fileContentHash, sizeBytes: file.size, order: 0 }];

    const assignments = await Promise.all(
      items.map(async (item) => {
        const { isDuplicate, existingLocation } = await dedupService.checkDuplicate(
          item.data,
          item.hash
        );
        return {
          ...item,
          skipUpload: isDuplicate,
          existingLocation: isDuplicate ? existingLocation : null,
        };
      })
    );

    context.chunkAssignments = assignments;
  }
}

export default DedupCheckStep;
