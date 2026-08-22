import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as authRepository from "./auth.repository.js";
import getRedisClient from "../../config/redis.config.js";
import ApiError from "../../utils/ApiError.js";
import config from "../../config/env.config.js";

const SALT_ROUNDS = 12;
const SESSION_PREFIX = "session:refresh:";

/** Build the Redis key for a user's refresh token */
const refreshKey = (userId) => `${SESSION_PREFIX}${userId}`;

// ─────────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────────

const signAccessToken = (payload) =>
  jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiry });

const signRefreshToken = (payload) =>
  jwt.sign(payload, config.refreshSecret, { expiresIn: config.refreshExpiry });

/**
 * Strip sensitive fields before returning user data to the client.
 */
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

// ─────────────────────────────────────────────
// Service methods
// ─────────────────────────────────────────────

/**
 * Sign up a new user.
 * Hashes password here (service layer) — not in the repository or controller.
 */
export const signup = async ({ name, email, password }) => {
  const existing = await authRepository.findUserByEmail(email);
  if (existing) throw new ApiError(409, "An account with this email already exists.");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await authRepository.createUser({ name, email, passwordHash });

  const payload = { userId: user._id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Persist refresh token in Redis — key expires with the token
  const redis = getRedisClient();
  const refreshExpirySeconds = parseDuration(config.refreshExpiry);
  await redis.set(refreshKey(user._id), refreshToken, "EX", refreshExpirySeconds);

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

/**
 * Log in an existing user.
 */
export const login = async ({ email, password }) => {
  const user = await authRepository.findUserByEmail(email);
  if (!user) throw new ApiError(401, "Invalid email or password.");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, "Invalid email or password.");

  const payload = { userId: user._id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const redis = getRedisClient();
  const refreshExpirySeconds = parseDuration(config.refreshExpiry);
  await redis.set(refreshKey(user._id), refreshToken, "EX", refreshExpirySeconds);

  return { user: sanitizeUser(user), accessToken, refreshToken };
};

/**
 * Issue a new access token if the provided refresh token is valid and
 * matches the one stored in Redis.
 */
export const refreshToken = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, config.refreshSecret);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  const redis = getRedisClient();
  const stored = await redis.get(refreshKey(payload.userId));

  if (!stored || stored !== token) {
    throw new ApiError(401, "Refresh token has been revoked. Please log in again.");
  }

  const newAccessToken = signAccessToken({ userId: payload.userId, role: payload.role });
  return { accessToken: newAccessToken };
};

/**
 * Log out — delete the Redis session key so the refresh token is invalidated.
 */
export const logout = async (userId) => {
  const redis = getRedisClient();
  await redis.del(refreshKey(userId));
};

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────

/**
 * Convert a JWT expiry string like "10d" or "1h" to seconds.
 * Used when setting Redis key TTL.
 */
const parseDuration = (str) => {
  const units = { s: 1, m: 60, h: 3600, d: 86400 };
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 86400; // fallback: 1 day
  return parseInt(match[1], 10) * (units[match[2]] ?? 86400);
};
