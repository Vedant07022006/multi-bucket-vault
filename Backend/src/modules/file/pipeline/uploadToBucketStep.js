import UploadStepBase from "./uploadStep.base.js";
import s3Adapter from "../../bucket/adapters/s3CompatibleAdapter.js";

/**
 * Step 5: Upload to Bucket (pre-signed URL generation)
 *
 * For each non-duplicate chunk/file, generates a pre-signed PUT URL.
 * The BROWSER uses this URL to upload bytes DIRECTLY to the bucket —
 * file bytes never pass through this Express server (edge offloading).
 *
 * For duplicate chunks, no URL is generated (they're already stored).
 *
 * Context mutations:
 *   context.presignedUrls = [{ order, url, bucketId, key, sizeBytes }]
 */
class UploadToBucketStep extends UploadStepBase {
  async execute(context) {
    const { chunkAssignments } = context;

    const presignedUrls = await Promise.all(
      chunkAssignments.map(async (assignment) => {
        if (assignment.skipUpload) {
          // Duplicate — no upload needed, include null URL so client knows to skip
          return {
            order: assignment.order,
            url: null,
            bucketId: assignment.bucketId,
            key: assignment.key,
            sizeBytes: assignment.sizeBytes,
            isDuplicate: true,
          };
        }

        // Generate a short-lived pre-signed PUT URL for direct browser upload
        const url = await s3Adapter.generatePresignedUrl(
          assignment.bucketDoc,
          assignment.key,
          "upload"
        );

        return {
          order: assignment.order,
          url,
          bucketId: assignment.bucketId,
          key: assignment.key,
          sizeBytes: assignment.sizeBytes,
          isDuplicate: false,
        };
      })
    );

    context.presignedUrls = presignedUrls;
  }
}

export default UploadToBucketStep;
