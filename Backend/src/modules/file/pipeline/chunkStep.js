import UploadStepBase from "./uploadStep.base.js";
import { chunkBuffer } from "../../../algorithms/rollingHash.js";
import * as bucketService from "../../bucket/bucket.service.js";
import config from "../../../config/env.config.js";

/**
 * Step 2: Chunk
 * Splits the file into content-defined chunks using Rabin-Karp rolling hash IF
 * the file is too large to fit in any single bucket's free space.
 *
 * If the file fits in one bucket, context.chunks stays empty and the rest of
 * the pipeline treats it as a single-piece upload.
 */
class ChunkStep extends UploadStepBase {
  async execute(context) {
    const { buffer, size } = context.file;

    // Check the largest available bucket's free space
    // (selectBucketForUpload will throw if nothing fits)
    const buckets = await bucketService.getAllBuckets();
    const activeBuckets = buckets.filter((b) => b.status === "active");
    const maxFree = Math.max(0, ...activeBuckets.map((b) => b.freeBytes ?? 0));

    if (activeBuckets.length > 0 && size <= maxFree) {
      // File fits in a single bucket — no chunking needed
      context.chunks = [];
      context.isChunked = false;
    } else {
      // File must be split across multiple buckets using content-defined chunking
      context.chunks = chunkBuffer(buffer, config.chunkSizeBytes);
      context.isChunked = true;
    }
  }
}

export default ChunkStep;
