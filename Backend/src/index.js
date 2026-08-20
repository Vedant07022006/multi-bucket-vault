import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./db/index.js";
import logger from "./utils/logger.js";

const PORT = process.env.PORT || 8000;

connectDB()
  .then(async () => {
    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    server.on("error", (error) => {
      logger.error("Server error:", error.message);
      process.exit(1);
    });
  })
  .catch((error) => {
    logger.error("Error connecting to the database:", error);
    process.exit(1);
  });
