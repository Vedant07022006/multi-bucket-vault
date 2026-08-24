import getRedisClient from "../config/redis.config.js";
import ApiError from "../utils/ApiError.js";
import config from "../config/env.config.js";

/**
 * Token Bucket Rate Limiter — implemented with Redis INCR + EXPIRE.
 *
 * Uses a sliding window counter per IP + route key:
 *  - On each request, increment the counter in Redis.
 *  - On first increment, set an expiry equal to the window duration.
 *  - If the counter exceeds the limit, reject with 429.
 *
 * The INCR + EXPIRE approach is atomic enough for this use case.
 * For absolute correctness under concurrency, a Lua script could be used.
 *
 * @param {Object} options
 * @param {number} [options.windowMs] - Window duration in ms (default from config)
 * @param {number} [options.max] - Max requests per window (default from config)
 * @returns {import('express').RequestHandler}
 */
export const rateLimiter = (options = {}) => {
  const windowMs = options.windowMs ?? config.rateLimitWindowMs;
  const max = options.max ?? config.rateLimitMaxRequests;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req, res, next) => {
    try {
      const redis = getRedisClient();
      // Key is scoped to IP + route path to allow different limits per route
      const key = `rate:${req.ip}:${req.path}`;

      const current = await redis.incr(key);

      if (current === 1) {
        // First request in this window — set the expiry
        await redis.expire(key, windowSeconds);
      }

      if (current > max) {
        const ttl = await redis.ttl(key);
        res.set("Retry-After", String(ttl));
        return next(new ApiError(429, `Too many requests. Retry after ${ttl} seconds.`));
      }

      // Set rate limit headers for transparency
      res.set({
        "X-RateLimit-Limit": String(max),
        "X-RateLimit-Remaining": String(Math.max(0, max - current)),
      });

      next();
    } catch (err) {
      // If Redis is down, fail open — don't block legitimate traffic
      next();
    }
  };
};
