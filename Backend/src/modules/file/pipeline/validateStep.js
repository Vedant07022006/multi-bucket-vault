import UploadStepBase from "./uploadStep.base.js";
import ApiError from "../../../utils/ApiError.js";
import config from "../../../config/env.config.js";

/** Allowed MIME type prefixes/exact values. Extend as needed. */
const ALLOWED_MIME_TYPES = new Set([
  "image/",
  "video/",
  "audio/",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/",
  "application/json",
  "application/octet-stream",
]);

const isMimeAllowed = (mime) =>
  [...ALLOWED_MIME_TYPES].some((allowed) =>
    allowed.endsWith("/") ? mime.startsWith(allowed) : mime === allowed
  );

/**
 * Step 1: Validate
 * Checks file size limits and MIME type before any bucket or storage interaction.
 * Short-circuits the chain if invalid.
 */
class ValidateStep extends UploadStepBase {
  async execute(context) {
    const { size, mimetype } = context.file;

    if (!size || size <= 0) {
      context.error = new ApiError(400, "File is empty.");
      return;
    }

    if (size > config.maxFileSizeBytes) {
      context.error = new ApiError(
        413,
        `File size (${(size / 1024 / 1024).toFixed(1)} MB) exceeds the maximum allowed (${(config.maxFileSizeBytes / 1024 / 1024).toFixed(0)} MB).`
      );
      return;
    }

    if (!isMimeAllowed(mimetype)) {
      context.error = new ApiError(415, `File type '${mimetype}' is not supported.`);
      return;
    }
  }
}

export default ValidateStep;
