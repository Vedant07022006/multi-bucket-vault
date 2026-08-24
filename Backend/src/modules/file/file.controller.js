import * as fileService from "./file.service.js";
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

/**
 * Thin controllers — reads req, delegates to fileService, returns via ApiResponse.
 */

/**
 * POST /api/files/upload
 * Expects a multipart/form-data body with a `file` field (handled by multer middleware).
 * Returns pre-signed URLs for the client to upload bytes directly to bucket(s).
 */
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.error(res, "No file provided in the request.", 400);
  }

  const folderId = req.body.folderId ?? null;
  const result = await fileService.initiateUpload(req.file, req.user.userId, folderId);

  return ApiResponse.created(res, result, "Upload initiated. Use the presigned URL(s) to transfer the file.");
});

/**
 * GET /api/files/:id/download
 * Returns pre-signed GET URL(s) for the client to download directly from bucket(s).
 */
export const downloadFile = asyncHandler(async (req, res) => {
  const result = await fileService.getDownloadUrls(req.params.id, req.user.userId);
  return ApiResponse.success(res, result, "Download URL(s) generated.");
});

/**
 * DELETE /api/files/:id
 */
export const deleteFile = asyncHandler(async (req, res) => {
  await fileService.deleteFile(req.params.id, req.user.userId);
  return ApiResponse.success(res, null, "File deleted successfully.");
});

/**
 * GET /api/files
 * Lists all files for the authenticated user, optionally filtered by folderId.
 */
export const listFiles = asyncHandler(async (req, res) => {
  const folderId = req.query.folderId ?? null;
  const files = await fileService.listFiles(req.user.userId, folderId);
  return ApiResponse.success(res, files);
});
