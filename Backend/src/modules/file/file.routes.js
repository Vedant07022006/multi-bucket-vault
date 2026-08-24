import { Router } from "express";
import multer from "multer";
import * as fileController from "./file.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { rateLimiter } from "../../middlewares/rateLimit.middleware.js";
import config from "../../config/env.config.js";

const router = Router();

// All file routes require authentication
router.use(authenticate);

// Multer: store uploaded files in memory (as Buffer).
// The buffer is then chunked/deduplicated; bytes never land on disk of the API server.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSizeBytes },
});

// POST /api/files/upload — stricter rate limit on uploads
router.post(
  "/upload",
  rateLimiter({ windowMs: 60_000, max: 20 }), // 20 uploads/minute
  upload.single("file"),
  fileController.uploadFile
);

// GET /api/files — list files (optionally ?folderId=xxx)
router.get("/", fileController.listFiles);

// GET /api/files/:id/download
router.get("/:id/download", fileController.downloadFile);

// DELETE /api/files/:id
router.delete("/:id", fileController.deleteFile);

export default router;
