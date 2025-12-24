/**
 * Custom error classes for the application
 * Provides structured error handling with HTTP status codes
 */

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly details?: unknown

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    details?: unknown
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.details = details

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor)

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * 400 Bad Request
 * Used for client errors and malformed requests
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, 400, true, details)
    Object.setPrototypeOf(this, BadRequestError.prototype)
  }
}

/**
 * 404 Not Found
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, 404, true, details)
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * 422 Unprocessable Entity
 * Used for validation errors
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 422, true, details)
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * 500 Internal Server Error
 * Used for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(message, 500, false, details)
    Object.setPrototypeOf(this, InternalServerError.prototype)
  }
}

/**
 * 503 Service Unavailable
 * Used when a required service (like DrawThings) is unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', details?: unknown) {
    super(message, 503, true, details)
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype)
  }
}
