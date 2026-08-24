import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import config from "../config/env.config.js";

/**
 * authenticate — Verifies the JWT Bearer token from the Authorization header.
 * Attaches the decoded payload as `req.user = { userId, role }`.
 * Rejects with 401 if the token is missing, malformed, or expired.
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError(401, "Authorization token is missing or malformed.");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    if (err.name === "TokenExpiredError") {
      return next(new ApiError(401, "Access token has expired. Please refresh."));
    }
    return next(new ApiError(401, "Invalid access token."));
  }
};

/**
 * requireAdmin — Must be used AFTER authenticate.
 * Rejects with 403 if the authenticated user is not an admin.
 */
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return next(new ApiError(403, "Admin privileges are required for this action."));
  }
  next();
};
