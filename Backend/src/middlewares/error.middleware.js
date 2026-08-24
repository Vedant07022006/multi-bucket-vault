import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";

/**
 * Centralized Express error handler.
 * Must be the LAST middleware registered in app.js.
 *
 * Normalizes different error types (Mongoose, MongoDB, ApiError) into a
 * consistent JSON response shape. Stack trace only in development.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = err instanceof ApiError ? err.statusCode : 500;
  let message = err.message || "Internal Server Error";
  let errors = err instanceof ApiError ? (err.errors ?? []) : [];

  // Mongoose CastError — invalid ObjectId in URL params
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for '${err.path}': ${err.value}`;
    errors = [];
  }

  // Mongoose ValidationError — schema-level validation
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed.";
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `'${field}' already exists.`;
    errors = [];
  }

  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} — ${message}`, err.stack);
  }

  const response = {
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  return res.status(statusCode).json(response);
};

export default errorHandler;
