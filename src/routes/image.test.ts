/**
 * Tests for /image route
 */

import request from 'supertest'
import express, { Express } from 'express'
import imageRouter from './image'
import { errorHandler } from '../middleware/errorHandler'

// Mock Constants module
jest.mock('../models/constants', () => ({
  Constants: {
    SAVE_IMAGE_DIR: '/mock/image/dir',
    DRAW_THINGS_IMAGE_DIR: '/mock/draw-things/dir',
    API_URL: 'http://mock-api'
  }
}))

describe('GET /image/:id', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use('/', imageRouter)
    app.use(errorHandler)
    jest.clearAllMocks()
  })

  it('should construct correct image path from job id', async () => {
    const jobId = 'test-job-123'

    // We can't easily test sendFile without a real file,
    // but we can verify the route accepts the request
    const response = await request(app).get(`/${jobId}`)

    // The response will be a 404 error since the file doesn't exist
    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      error: 'NotFound',
      message: expect.stringContaining(jobId)
    })
  })

  it('should handle special characters in job id', async () => {
    const jobId = 'job-with_special.chars'
    const response = await request(app).get(`/${jobId}`)

    // Will fail to find file, but route should handle the request
    expect([404, 500]).toContain(response.status)
  })

  it('should accept valid job id format', async () => {
    const jobId = 'a1b2c3d4e5'
    const response = await request(app).get(`/${jobId}`)

    // Will fail to find file, but route should accept the format
    expect([404, 500]).toContain(response.status)
  })

  // Path traversal attack prevention tests
  describe('Path Traversal Protection', () => {
    it('should reject job id with parent directory traversal (..)', async () => {
      const response = await request(app).get('/..%2Fetc%2Fpasswd')

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('cannot contain')
          })
        ])
      })
    })

    it('should reject job id with encoded slash (%2F)', async () => {
      const response = await request(app).get('/path%2Fto%2Ffile')

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Validation failed')
    })

    it('should reject job id with backslash', async () => {
      const response = await request(app).get('/path\\to\\file')

      // Express routing may not match this as a valid :id param, resulting in 404
      // Either 400 (validation) or 404 (no route match) is acceptable
      expect([400, 404]).toContain(response.status)
    })

    it('should reject job id with double dots', async () => {
      const response = await request(app).get('/..%2F..%2Fsecret')

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Validation failed')
    })

    it('should reject job id with invalid characters like angle brackets', async () => {
      const response = await request(app).get('/job%3Cscript%3E')

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Validation failed')
    })

    it('should accept safe job IDs with dots', async () => {
      // Dots are allowed but not consecutive dots (..)
      const response = await request(app).get('/job.123.test')

      // Will fail to find file, but validation should pass
      expect(response.status).toBe(404)
      expect(response.body.error).toBe('NotFound')
    })

    it('should accept safe job IDs with dashes and underscores', async () => {
      const response = await request(app).get('/job-test_123')

      // Will fail to find file, but validation should pass
      expect(response.status).toBe(404)
      expect(response.body.error).toBe('NotFound')
    })
  })
})
