import { Router } from "express";
import * as folderController from "./folder.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();
router.use(authenticate);

// POST /api/folders — create a folder
router.post("/", folderController.createFolder);

// GET /api/folders/:id/contents — list contents (use "root" for top-level)
router.get("/:id/contents", folderController.getFolderContents);

// DELETE /api/folders/:id — delete folder and all its contents
router.delete("/:id", folderController.deleteFolder);

export default router;
