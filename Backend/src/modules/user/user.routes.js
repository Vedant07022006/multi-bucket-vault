import { Router } from "express";
import * as userController from "./user.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();
router.use(authenticate);

// GET /api/users/me
router.get("/me", userController.getMe);

// PATCH /api/users/me
router.patch("/me", userController.updateMe);

export default router;
