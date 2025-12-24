/**
 * Standardized API response utilities
 * Provides consistent response format across all endpoints
 */

import { Response } from 'express'

/**
 * Standard success response format
 */
interface SuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
}

/**
 * Sends a standardized success response
 *
 * @param res - Express response object
 * @param data - The response data
 * @param statusCode - HTTP status code (default: 200)
 * @param message - Optional success message
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data
  }

  if (message) {
    response.message = message
  }

  res.status(statusCode).json(response)
}

/**
 * Sends a 201 Created response
 *
 * @param res - Express response object
 * @param data - The created resource data
 * @param message - Optional success message
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message?: string
): void {
  sendSuccess(res, data, 201, message)
}

/**
 * Sends a 204 No Content response
 *
 * @param res - Express response object
 */
export function sendNoContent(res: Response): void {
  res.status(204).send()
}
