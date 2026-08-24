import { Router } from "express";
import * as bucketController from "./bucket.controller.js";
import { authenticate, requireAdmin } from "../../middlewares/auth.middleware.js";

const router = Router();

// All bucket management routes are admin-only
router.use(authenticate, requireAdmin);

// POST /api/buckets — register a new storage bucket
router.post("/", bucketController.registerBucket);

// GET /api/buckets — list all buckets with usage summary
router.get("/", bucketController.listBuckets);

// GET /api/buckets/:id/health — check a specific bucket's health
router.get("/:id/health", bucketController.getBucketHealth);

export default router;
