/**
 * Tests for imageUtils
 */

import { saveImage } from './imageUtils'
import fs from 'fs'
import path from 'path'

jest.mock('fs')
const mockFs = fs as jest.Mocked<typeof fs>

// Mock Constants module
jest.mock('../models/constants', () => ({
  Constants: {
    SAVE_IMAGE_DIR: '/mock/image/dir',
    DRAW_THINGS_IMAGE_DIR: '/mock/draw-things/dir',
    API_URL: 'http://mock-api'
  }
}))

describe('imageUtils', () => {
  const testJobId = 'test-job-123'
  const testBase64Image =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup fs promises mocks
    mockFs.promises = {
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined)
    } as any
  })

  describe('saveImage', () => {
    it('should create directory if it does not exist', async () => {
      await saveImage(testBase64Image, testJobId)

      expect(mockFs.promises.mkdir).toHaveBeenCalledWith('/mock/image/dir', {
        recursive: true
      })
    })

    it('should save image with correct filename', async () => {
      await saveImage(testBase64Image, testJobId)

      const expectedPath = path.join('/mock/image/dir', `${testJobId}.png`)
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        expectedPath,
        expect.any(Buffer)
      )
    })

    it('should convert base64 to buffer correctly', async () => {
      await saveImage(testBase64Image, testJobId)

      const expectedBuffer = Buffer.from(testBase64Image, 'base64')
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expectedBuffer
      )
    })

    it('should throw error if mkdir fails', async () => {
      const mockError = new Error('Permission denied')
      mockFs.promises.mkdir = jest.fn().mockRejectedValue(mockError)

      await expect(saveImage(testBase64Image, testJobId)).rejects.toThrow(
        'Permission denied'
      )
    })

    it('should throw error if writeFile fails', async () => {
      const mockError = new Error('Disk full')
      mockFs.promises.writeFile = jest.fn().mockRejectedValue(mockError)

      await expect(saveImage(testBase64Image, testJobId)).rejects.toThrow(
        'Disk full'
      )
    })

    it('should handle empty base64 string', async () => {
      await saveImage('', testJobId)

      const expectedBuffer = Buffer.from('', 'base64')
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expectedBuffer
      )
    })

    it('should handle special characters in jobId', async () => {
      const specialJobId = 'job-with-special_chars.123'
      await saveImage(testBase64Image, specialJobId)

      const expectedPath = path.join('/mock/image/dir', `${specialJobId}.png`)
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        expectedPath,
        expect.any(Buffer)
      )
    })
  })
})
