import ApiError from "../utils/ApiError.js";

/**
 * Validate middleware factory.
 * Takes a Joi schema and returns an Express middleware that validates
 * req.body (or optionally req.params / req.query) before the request
 * reaches the controller.
 *
 * On failure: calls next(validationError) with a 400 ApiError — caught by error.middleware.js.
 * On success: calls next() and the validated/coerced values are in req.body.
 *
 * @param {import('joi').ObjectSchema} schema - A Joi schema to validate against
 * @param {'body'|'params'|'query'} [source='body'] - Which part of the request to validate
 * @returns {import('express').RequestHandler}
 */
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false, // Collect ALL errors, not just the first
      stripUnknown: true, // Remove extra fields not in the schema
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return next(new ApiError(400, messages.join("; "), messages));
    }

    // Replace req[source] with the coerced/sanitized value from Joi
    req[source] = value;
    next();
  };
};
