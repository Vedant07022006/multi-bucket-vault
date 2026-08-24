import { randomUUID } from "crypto";
import UploadStepBase from "./uploadStep.base.js";
import * as bucketService from "../../bucket/bucket.service.js";
import ApiError from "../../../utils/ApiError.js";

/**
 * Step 4: Bin Pack
 * For each chunk/file that isn't a duplicate (skipUpload = false),
 * selects a target bucket using the active bin-packing strategy and
 * assigns a unique object key.
 *
 * Context mutations:
 *   Each chunkAssignment gets: { bucketId, key } added.
 */
class BinPackStep extends UploadStepBase {
  async execute(context) {
    const { chunkAssignments, ownerId } = context;

    for (const assignment of chunkAssignments) {
      if (assignment.skipUpload) {
        // Duplicate — reuse the existing bucket/key from dedup lookup
        assignment.bucketId = assignment.existingLocation.bucketId;
        assignment.key = assignment.existingLocation.key;
        continue;
      }

      const bucket = await bucketService.selectBucketForUpload(assignment.sizeBytes);
      if (!bucket) {
        context.error = new ApiError(507, "No bucket available to store this file.");
        return;
      }

      // Generate a unique, collision-resistant key scoped to the owner
      assignment.bucketId = bucket._id.toString();
      assignment.bucketDoc = bucket; // Kept for uploadToBucketStep
      assignment.key = `${ownerId}/${randomUUID()}`;
    }
  }
}

export default BinPackStep;
