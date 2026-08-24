import mongoose from "mongoose";
import logger from "../utils/logger.js";

const DB_NAME = "multi-bucket-vault";

/**
 * Connects Mongoose to MongoDB using MONGO_URI from env.
 * Called once in server.js on startup.
 * Throws on failure so the server startup sequence can catch and exit cleanly.
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI is not defined in environment variables.");

    const conn = await mongoose.connect(`${uri}/${DB_NAME}`);
    logger.info(`MongoDB connected! Host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

export default connectDB;
