import * as bucketService from "./bucket.service.js";
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

/**
 * Thin controllers — all admin-only (enforced by requireAdmin middleware in routes).
 */

export const registerBucket = asyncHandler(async (req, res) => {
  const bucket = await bucketService.registerBucket(req.body);
  return ApiResponse.created(res, bucket, "Bucket registered successfully.");
});

export const listBuckets = asyncHandler(async (req, res) => {
  const summary = await bucketService.getBucketUsageSummary();
  return ApiResponse.success(res, summary, "Bucket usage summary retrieved.");
});

export const getBucketHealth = asyncHandler(async (req, res) => {
  const bucket = await bucketService.getBucketById(req.params.id);
  if (!bucket) return ApiResponse.error(res, "Bucket not found.", 404);

  return ApiResponse.success(res, {
    _id: bucket._id,
    status: bucket.status,
    provider: bucket.provider,
    endpoint: bucket.endpoint,
    usedBytes: bucket.usedBytes,
    capacityBytes: bucket.capacityBytes,
    freeBytes: bucket.freeBytes,
    usageFraction: bucket.usageFraction,
  });
});
