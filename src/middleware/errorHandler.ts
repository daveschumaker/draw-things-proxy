/**
 * Centralized error handling middleware
 * Catches all errors and sends standardized responses
 */

import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors'
import { config } from '../config'
import { log } from '../utils/logger'

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: string
  message: string
  details?: unknown
  stack?: string
}

/**
 * Logs error with appropriate level based on severity
 */
function logError(error: Error | AppError): void {
  const isOperational = error instanceof AppError && error.isOperational

  if (isOperational) {
    // Operational errors are expected and logged as warnings
    log.warn('Operational error', {
      message: error.message,
      statusCode: error instanceof AppError ? error.statusCode : 500,
      details: error instanceof AppError ? error.details : undefined
    })
  } else {
    // Programming errors or unexpected failures are logged as errors
    log.error('Unexpected error', {
      message: error.message,
      stack: error.stack
    })
  }
}

/**
 * Formats error into a standardized response
 */
function formatErrorResponse(error: Error | AppError): ErrorResponse {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      error: 'Validation Error',
      message: 'Request validation failed',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    }
  }

  // Handle custom AppErrors
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: error.constructor.name.replace('Error', ''),
      message: error.message
    }

    if (error.details) {
      response.details = error.details
    }

    // Include stack trace in development
    if (config.server.isDevelopment && error.stack) {
      response.stack = error.stack
    }

    return response
  }

  // Handle unexpected errors
  return {
    error: 'Internal Server Error',
    message: config.server.isProduction
      ? 'An unexpected error occurred'
      : error.message,
    ...(config.server.isDevelopment && error.stack ? { stack: error.stack } : {})
  }
}

/**
 * Determines HTTP status code for the error
 */
function getStatusCode(error: Error | AppError): number {
  if (error instanceof ZodError) {
    return 400
  }

  if (error instanceof AppError) {
    return error.statusCode
  }

  return 500
}

/**
 * Global error handler middleware
 * Must be registered after all routes
 */
/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
export function errorHandler(
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  /* eslint-enable @typescript-eslint/no-unused-vars, no-unused-vars */
  // Log the error
  logError(error)

  // Get status code and format response
  const statusCode = getStatusCode(error)
  const errorResponse = formatErrorResponse(error)

  // Send error response
  res.status(statusCode).json(errorResponse)
}

/**
 * Middleware to catch async errors
 * Wraps async route handlers to catch promise rejections
 */
export function asyncHandler(
  fn: (_req: Request, _res: Response, _next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
