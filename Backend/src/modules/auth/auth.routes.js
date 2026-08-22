import { Router } from "express";
import * as authController from "./auth.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
} from "./auth.validation.js";

const router = Router();

// POST /api/auth/signup
router.post("/signup", validate(signupSchema), authController.signup);

// POST /api/auth/login
router.post("/login", validate(loginSchema), authController.login);

// POST /api/auth/refresh — no auth middleware; refresh token IS the credential
router.post("/refresh", validate(refreshTokenSchema), authController.refresh);

// POST /api/auth/logout — must be authenticated to identify whose session to destroy
router.post("/logout", authenticate, authController.logout);

export default router;
