/**
 * Facade Pattern — every controller uses this instead of building res.json() manually.
 * Guarantees a consistent response envelope across the entire API:
 *   { success, message, data }  — success
 *   { success, message }        — error
 */
class ApiResponse {
  /**
   * @param {import('express').Response} res
   * @param {*} data
   * @param {string} [message]
   * @param {number} [status]
   */
  static success(res, data, message = "Success", status = 200) {
    return res.status(status).json({ success: true, message, data });
  }

  /**
   * @param {import('express').Response} res
   * @param {string} [message]
   * @param {number} [status]
   */
  static error(res, message = "Something went wrong", status = 500) {
    return res.status(status).json({ success: false, message });
  }

  /**
   * Convenience for 201 Created responses.
   */
  static created(res, data, message = "Created successfully") {
    return ApiResponse.success(res, data, message, 201);
  }
}

export default ApiResponse;
