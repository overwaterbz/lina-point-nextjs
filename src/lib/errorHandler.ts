/**
 * Centralized Error Handling
 * Standardizes error responses across all API routes
 */

import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Create standardized error response
 */
export const createErrorResponse = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown,
): NextResponse<ErrorResponse> => {
  logError(message, details);

  return NextResponse.json(
    {
      success: false,
      error: message,
      code: code || "INTERNAL_ERROR",
      ...(process.env.NODE_ENV !== "production" && { details }),
    },
    { status: statusCode },
  );
};

/**
 * Handle authentication errors
 */
export const handleAuthError = (): NextResponse<ErrorResponse> => {
  return createErrorResponse(
    "Unauthorized: Please log in",
    401,
    "AUTH_REQUIRED",
  );
};

/**
 * Handle validation errors
 */
export const handleValidationError = (
  message: string,
  details?: unknown,
): NextResponse<ErrorResponse> => {
  return createErrorResponse(message, 400, "VALIDATION_ERROR", details);
};

/**
 * Handle database errors
 */
export const handleDatabaseError = (
  error: unknown,
): NextResponse<ErrorResponse> => {
  const message = error instanceof Error ? error.message : "Database error";
  return createErrorResponse(
    `Database error: ${message}`,
    500,
    "DATABASE_ERROR",
    error,
  );
};

/**
 * Handle external service errors
 */
export const handleServiceError = (
  serviceName: string,
  error: unknown,
): NextResponse<ErrorResponse> => {
  const message = error instanceof Error ? error.message : "Service error";
  return createErrorResponse(
    `${serviceName} error: ${message}`,
    503,
    "SERVICE_ERROR",
    error,
  );
};
