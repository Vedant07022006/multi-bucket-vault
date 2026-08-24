import { Redis } from "ioredis";
import logger from "../utils/logger.js";

let redisClient = null;

/**
 * Returns the singleton Redis client, creating it on first call.
 * Imported by auth.service, rateLimit.middleware, queue.config, etc.
 */
const getRedisClient = () => {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not defined in environment variables.");

  redisClient = new Redis(url, {
    // Retry up to 3 times on disconnect before giving up
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  redisClient.on("connect", () => logger.info("Redis client connected."));
  redisClient.on("error", (err) => logger.error("Redis client error:", err.message));

  return redisClient;
};

export default getRedisClient;
