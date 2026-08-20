import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  let statusCode = err instanceof ApiError ? err.statusCode : 500;
  let message = err.message || "Internal Server Error";
  let errors = err instanceof ApiError ? err.errors : [];

  // Mongoose CastError — e.g. invalid ObjectId format in URL params
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for field '${err.path}': ${err.value}`;
    errors = [];
  }

  // Mongoose ValidationError — schema-level validation failures
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `Duplicate value: '${field}' already exists`;
    errors = [];
  }

  const stack = process.env.NODE_ENV === "development" ? err.stack : undefined;

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack,
  });
};

export default errorHandler;
