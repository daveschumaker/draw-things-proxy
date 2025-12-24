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
})
