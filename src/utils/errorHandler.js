import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * Global error handler middleware that ensures all errors are returned as JSON
 * instead of HTML, making them easier to process in frontend applications
 */
export const errorHandler = (err, req, res, next) => {
  // Console log for debugging in development
  console.error("ERROR ❌", err);
  
  // If the error is already an ApiError instance, use its properties
  if (err instanceof ApiError) {
    return res
      .status(err.statusCode)
      .json(new ApiResponse(err.statusCode, null, err.message));
  }
  
  // For JWT and other authentication errors that might have a status code
  const statusCode = err.statusCode || 500;
  const message = err.message || "Something went wrong";
  
  // Return standardized JSON error response
  return res
    .status(statusCode)
    .json(new ApiResponse(statusCode, null, message));
};