import "dotenv/config";

/**
 * Validates that all required environment variables exist at startup.
 * Throws a descriptive error rather than letting the app fail silently later.
 */
const REQUIRED_VARS = [
  "MONGO_URI",
  "REDIS_URL",
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
  "ENCRYPTION_KEY", // 32-char key for AES-256-CBC encryption of bucket credentials
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `[env.config] Missing required environment variables: ${missing.join(", ")}`
  );
}

const config = {
  port: parseInt(process.env.PORT || "8000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL,

  // Auth / JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.ACCESS_TOKEN_EXPIRY || "1d",
  refreshSecret: process.env.REFRESH_TOKEN_SECRET,
  refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY || "10d",

  // Storage
  encryptionKey: process.env.ENCRYPTION_KEY, // Must be exactly 32 chars for AES-256
  bucketStrategy: process.env.BUCKET_STRATEGY || "bestFit", // 'bestFit' | 'leastUsed'
  maxFileSizeBytes: parseInt(
    process.env.MAX_FILE_SIZE_BYTES || String(100 * 1024 * 1024), // 100 MB default
    10
  ),
  chunkSizeBytes: parseInt(
    process.env.CHUNK_SIZE_BYTES || String(5 * 1024 * 1024), // 5 MB per chunk
    10
  ),
  presignedUrlExpirySeconds: parseInt(
    process.env.PRESIGNED_URL_EXPIRY_SECONDS || "900", // 15 minutes
    10
  ),

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),

  // Rebalance trigger (0.85 = 85% bucket usage)
  rebalanceThreshold: parseFloat(process.env.REBALANCE_THRESHOLD || "0.85"),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "*",
};

export default config;
