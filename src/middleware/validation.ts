/**
 * Validation middleware for Express routes
 */

import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'

/**
 * Middleware factory to validate request body against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message
          }))
        })
      } else {
        res.status(500).json({
          error: 'Internal validation error'
        })
      }
    }
  }
}

/**
 * Middleware factory to validate query parameters against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req.query = schema.parse(req.query) as any
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message
          }))
        })
      } else {
        res.status(500).json({
          error: 'Internal validation error'
        })
      }
    }
  }
}

/**
 * Middleware factory to validate route parameters against a Zod schema
 * Useful for validating :id params to prevent path traversal attacks
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req.params = schema.parse(req.params) as any
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message
          }))
        })
      } else {
        res.status(500).json({
          error: 'Internal validation error'
        })
      }
    }
  }
}
