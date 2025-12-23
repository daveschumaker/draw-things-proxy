/**
 * Tests for imageAppController
 */

import {
  checkImageGenerationAppStatus,
  getImageGenerationAppStatus
} from './imageAppController'
import fetch from 'node-fetch'

jest.mock('node-fetch')
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('imageAppController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkImageGenerationAppStatus', () => {
    it('should set status to true when app responds with ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      } as any)

      await checkImageGenerationAppStatus()
      const status = getImageGenerationAppStatus()

      expect(status).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:7860')
    })

    it('should set status to false when app responds with not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      } as any)

      await checkImageGenerationAppStatus()
      const status = getImageGenerationAppStatus()

      expect(status).toBe(false)
    })

    it('should set status to false when fetch throws an error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      await checkImageGenerationAppStatus()
      const status = getImageGenerationAppStatus()

      expect(status).toBe(false)
    })

    it('should update status from true to false when app goes down', async () => {
      // First check - app is up
      mockFetch.mockResolvedValueOnce({
        ok: true
      } as any)
      await checkImageGenerationAppStatus()
      expect(getImageGenerationAppStatus()).toBe(true)

      // Second check - app is down
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))
      await checkImageGenerationAppStatus()
      expect(getImageGenerationAppStatus()).toBe(false)
    })

    it('should update status from false to true when app comes up', async () => {
      // First check - app is down
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))
      await checkImageGenerationAppStatus()
      expect(getImageGenerationAppStatus()).toBe(false)

      // Second check - app is up
      mockFetch.mockResolvedValueOnce({
        ok: true
      } as any)
      await checkImageGenerationAppStatus()
      expect(getImageGenerationAppStatus()).toBe(true)
    })
  })

  describe('getImageGenerationAppStatus', () => {
    it('should return false initially before any check', () => {
      const status = getImageGenerationAppStatus()
      expect(typeof status).toBe('boolean')
    })

    it('should return the current status without making a network call', () => {
      mockFetch.mockClear()
      getImageGenerationAppStatus()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
