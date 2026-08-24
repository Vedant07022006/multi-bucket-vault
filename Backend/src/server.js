import "./config/env.config.js"; // Validates env vars — must be first import
import app from "./app.js";
import connectDB from "./config/db.config.js";
import getRedisClient from "./config/redis.config.js";
import logger from "./utils/logger.js";
import bucketEvents from "./events/bucketEvents.js";
import { addRebalanceJob } from "./queues/jobs/rebalance.job.js";
import ConsistentHashRing from "./algorithms/consistentHashing.js";
import * as bucketRepository from "./modules/bucket/bucket.repository.js";

const PORT = process.env.PORT || 8000;

/**
 * Seed the consistent hash ring with all currently registered buckets.
 * This runs once on startup — new buckets added via API update the ring live.
 */
const seedConsistentHashRing = async () => {
  const buckets = await bucketRepository.findAll();
  const ring = ConsistentHashRing.getInstance();
  for (const bucket of buckets) {
    ring.addBucket(bucket._id.toString());
  }
  logger.info(`[ConsistentHashRing] Seeded with ${buckets.length} bucket(s).`);
};

/**
 * Register Observer subscribers for bucket events.
 * Decouples "bucket is near full" from "queue a rebalance job".
 */
const registerEventSubscribers = () => {
  bucketEvents.on("bucket:nearFull", async ({ bucketId }) => {
    logger.warn(`[Observer] bucket:nearFull fired for bucket ${bucketId}`);
    await addRebalanceJob({ bucketId });
  });
};

const start = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Connect to Redis (ping to confirm)
    const redis = getRedisClient();
    await redis.ping();
    logger.info("Redis connection confirmed.");

    // 3. Seed hash ring + register event subscribers
    await seedConsistentHashRing();
    registerEventSubscribers();

    // 4. Start the HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    server.on("error", (error) => {
      logger.error("Server error:", error.message);
      process.exit(1);
    });

    // 5. Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
