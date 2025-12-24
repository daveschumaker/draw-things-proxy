/**
 * Tests for validation middleware
 */

import { Request, Response } from 'express'
import { validateBody, validateQuery, validateParams } from './validation'
import { z } from 'zod'

describe('validation middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: jest.Mock

  beforeEach(() => {
    mockRequest = {}
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }
    nextFunction = jest.fn()
  })

  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().int().min(0)
    })

    it('should call next() when validation passes', () => {
      mockRequest.body = { name: 'John', age: 30 }

      const middleware = validateBody(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should return 400 with errors when validation fails', () => {
      mockRequest.body = { name: '', age: -5 }

      const middleware = validateBody(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              path: expect.any(String),
              message: expect.any(String)
            })
          ])
        })
      )
    })

    it('should return 400 when required fields are missing', () => {
      mockRequest.body = {}

      const middleware = validateBody(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(400)
    })

    it('should coerce and validate data types', () => {
      mockRequest.body = { name: 'Jane', age: 25 }

      const middleware = validateBody(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockRequest.body).toEqual({ name: 'Jane', age: 25 })
    })
  })

  describe('validateQuery', () => {
    const testSchema = z.object({
      page: z.string().optional(),
      limit: z.string().optional()
    })

    it('should call next() when query validation passes', () => {
      mockRequest.query = { page: '1', limit: '10' }

      const middleware = validateQuery(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should return 400 with errors when query validation fails', () => {
      const strictSchema = z.object({
        page: z.string().regex(/^\d+$/)
      })

      mockRequest.query = { page: 'invalid' }

      const middleware = validateQuery(strictSchema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(400)
    })

    it('should handle empty query parameters', () => {
      mockRequest.query = {}

      const middleware = validateQuery(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
    })
  })

  describe('validateParams', () => {
    const testSchema = z.object({
      id: z
        .string()
        .min(1)
        .regex(/^[a-zA-Z0-9_.-]+$/)
        .refine((id) => !id.includes('..'))
    })

    it('should call next() when params validation passes', () => {
      mockRequest.params = { id: 'valid-job-id-123' }

      const middleware = validateParams(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should return 400 when params contain path traversal', () => {
      mockRequest.params = { id: '../../../etc/passwd' }

      const middleware = validateParams(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed'
        })
      )
    })

    it('should return 400 when params contain invalid characters', () => {
      mockRequest.params = { id: 'job/with/slashes' }

      const middleware = validateParams(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(400)
    })

    it('should allow safe special characters', () => {
      mockRequest.params = { id: 'job-with_dots.and-dashes' }

      const middleware = validateParams(testSchema)
      middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
    })
  })
})
