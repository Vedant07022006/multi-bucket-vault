import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/user/user.routes.js";
import fileRoutes from "../modules/file/file.routes.js";
import folderRoutes from "../modules/folder/folder.routes.js";
import bucketRoutes from "../modules/bucket/bucket.routes.js";

/**
 * Central route assembler — the ONLY file that mounts all module routers.
 * app.js imports ONLY this file; individual route files never touch app.js.
 */
const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/files", fileRoutes);
router.use("/folders", folderRoutes);
router.use("/buckets", bucketRoutes); // Admin-only (enforced inside bucket.routes.js)

export default router;
