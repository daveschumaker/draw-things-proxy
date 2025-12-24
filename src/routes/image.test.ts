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

// Mock fs/promises module
jest.mock('fs/promises')

// Mock sharp module
jest.mock('sharp')

// Get references to mocked functions
import * as fsPromises from 'fs/promises'
import sharp from 'sharp'

const mockAccess = fsPromises.access as jest.MockedFunction<
  typeof fsPromises.access
>
const mockReadFile = fsPromises.readFile as jest.MockedFunction<
  typeof fsPromises.readFile
>

const mockSharp = sharp as jest.MockedFunction<typeof sharp>
const mockWebp = jest.fn().mockReturnThis()
const mockJpeg = jest.fn().mockReturnThis()
const mockToBuffer = jest.fn()

mockSharp.mockImplementation(
  () =>
    ({
      webp: mockWebp,
      jpeg: mockJpeg,
      toBuffer: mockToBuffer
    }) as unknown as ReturnType<typeof sharp>
)

describe('GET /image/:id', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use('/', imageRouter)
    app.use(errorHandler)
    jest.clearAllMocks()
  })

  it('should return 404 when image file does not exist', async () => {
    const jobId = 'test-job-123'
    mockAccess.mockRejectedValue(new Error('File not found'))

    const response = await request(app).get(`/${jobId}`)

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      error: 'NotFound',
      message: expect.stringContaining(jobId)
    })
  })

  it('should return PNG file by default', async () => {
    const jobId = 'test-job-123'
    const mockBuffer = Buffer.from('fake-png-data')

    mockAccess.mockResolvedValue(undefined)
    mockReadFile.mockResolvedValue(mockBuffer)

    const response = await request(app).get(`/${jobId}`)

    expect(response.status).toBe(200)
    expect(response.header['content-type']).toBe('image/png')
    expect(response.header['content-disposition']).toContain('test-job-123.png')
    expect(response.body).toEqual(mockBuffer)
  })

  it('should handle special characters in job id', async () => {
    const jobId = 'job-with_special.chars'
    mockAccess.mockRejectedValue(new Error('File not found'))

    const response = await request(app).get(`/${jobId}`)

    // Will fail to find file, but route should handle the request
    expect([404, 500]).toContain(response.status)
  })

  it('should accept valid job id format', async () => {
    const jobId = 'a1b2c3d4e5'
    mockAccess.mockRejectedValue(new Error('File not found'))

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

  // Format conversion tests
  describe('Format Conversion', () => {
    const jobId = 'test-image'

    beforeEach(() => {
      mockAccess.mockResolvedValue(undefined)
    })

    it('should convert PNG to WebP format', async () => {
      const mockBuffer = Buffer.from('fake-webp-data')
      mockToBuffer.mockResolvedValue(mockBuffer)

      const response = await request(app).get(`/${jobId}?format=webp`)

      expect(response.status).toBe(200)
      expect(response.header['content-type']).toBe('image/webp')
      expect(response.header['content-disposition']).toContain(
        'test-image.webp'
      )
      expect(mockWebp).toHaveBeenCalled()
      expect(mockToBuffer).toHaveBeenCalled()
    })

    it('should convert PNG to JPEG format', async () => {
      const mockBuffer = Buffer.from('fake-jpeg-data')
      mockToBuffer.mockResolvedValue(mockBuffer)

      const response = await request(app).get(`/${jobId}?format=jpeg`)

      expect(response.status).toBe(200)
      expect(response.header['content-type']).toBe('image/jpeg')
      expect(response.header['content-disposition']).toContain('test-image.jpg')
      expect(mockJpeg).toHaveBeenCalled()
      expect(mockToBuffer).toHaveBeenCalled()
    })

    it('should convert PNG to JPG format', async () => {
      const mockBuffer = Buffer.from('fake-jpg-data')
      mockToBuffer.mockResolvedValue(mockBuffer)

      const response = await request(app).get(`/${jobId}?format=jpg`)

      expect(response.status).toBe(200)
      expect(response.header['content-type']).toBe('image/jpeg')
      expect(response.header['content-disposition']).toContain('test-image.jpg')
    })

    it('should reject invalid format parameter', async () => {
      const response = await request(app).get(`/${jobId}?format=gif`)

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Validation failed')
    })
  })

  // Base64 response tests
  describe('Base64 Response', () => {
    const jobId = 'test-image'

    beforeEach(() => {
      mockAccess.mockResolvedValue(undefined)
    })

    it('should return base64 encoded PNG', async () => {
      const mockBuffer = Buffer.from('fake-png-data')
      mockReadFile.mockResolvedValue(mockBuffer)

      const response = await request(app).get(`/${jobId}?response=base64`)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: jobId,
        format: 'png',
        mimeType: 'image/png',
        data: mockBuffer.toString('base64')
      })
    })

    it('should return base64 encoded WebP', async () => {
      const mockBuffer = Buffer.from('fake-webp-data')
      mockToBuffer.mockResolvedValue(mockBuffer)

      const response = await request(app).get(
        `/${jobId}?format=webp&response=base64`
      )

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: jobId,
        format: 'webp',
        mimeType: 'image/webp',
        data: mockBuffer.toString('base64')
      })
    })

    it('should return base64 encoded JPEG', async () => {
      const mockBuffer = Buffer.from('fake-jpeg-data')
      mockToBuffer.mockResolvedValue(mockBuffer)

      const response = await request(app).get(
        `/${jobId}?format=jpeg&response=base64`
      )

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: jobId,
        format: 'jpg',
        mimeType: 'image/jpeg',
        data: mockBuffer.toString('base64')
      })
    })

    it('should reject invalid response parameter', async () => {
      const response = await request(app).get(`/${jobId}?response=invalid`)

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Validation failed')
    })
  })

  // Combined format and response tests
  describe('Format and Response Combinations', () => {
    const jobId = 'test-image'

    beforeEach(() => {
      mockAccess.mockResolvedValue(undefined)
    })

    it('should return file by default when only format is specified', async () => {
      const mockBuffer = Buffer.from('fake-webp-data')
      mockToBuffer.mockResolvedValue(mockBuffer)

      const response = await request(app).get(`/${jobId}?format=webp`)

      expect(response.status).toBe(200)
      expect(response.header['content-type']).toBe('image/webp')
      expect(Buffer.isBuffer(response.body)).toBe(true)
    })

    it('should return PNG when only response type is specified', async () => {
      const mockBuffer = Buffer.from('fake-png-data')
      mockReadFile.mockResolvedValue(mockBuffer)

      const response = await request(app).get(`/${jobId}?response=file`)

      expect(response.status).toBe(200)
      expect(response.header['content-type']).toBe('image/png')
    })

    it('should handle both format and response as file', async () => {
      const mockBuffer = Buffer.from('fake-webp-data')
      mockToBuffer.mockResolvedValue(mockBuffer)

      const response = await request(app).get(
        `/${jobId}?format=webp&response=file`
      )

      expect(response.status).toBe(200)
      expect(response.header['content-type']).toBe('image/webp')
    })
  })
})
