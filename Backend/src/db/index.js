import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import logger from "../utils/logger.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGODB_URL}/${DB_NAME}`
        );
        logger.info(
            `MongoDB connected! Host: ${connectionInstance.connection.host}`
        );
        return connectionInstance;
    } catch (error) {
        logger.error("MongoDB connection failed:", error.message);
        throw error;
    }
};

export default connectDB;
