/**
 * Tests for main router
 */

import request from 'supertest'
import express, { Express } from 'express'
import router from './index'
import * as imageAppController from '../controllers/imageAppController'

jest.mock('../controllers/imageAppController')
jest.mock('../controllers/jobController')

describe('Main Router', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api', router)
    jest.clearAllMocks()
  })

  describe('GET /api/heartbeat', () => {
    it('should return isAlive true when app is running', async () => {
      jest
        .spyOn(imageAppController, 'getImageGenerationAppStatus')
        .mockReturnValue(true)

      const response = await request(app).get('/api/heartbeat')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ isAlive: true })
    })

    it('should return isAlive false when app is not running', async () => {
      jest
        .spyOn(imageAppController, 'getImageGenerationAppStatus')
        .mockReturnValue(false)

      const response = await request(app).get('/api/heartbeat')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ isAlive: false })
    })
  })

  describe('Route mounting', () => {
    it('should mount /generate route', async () => {
      jest
        .spyOn(imageAppController, 'getImageGenerationAppStatus')
        .mockReturnValue(false)

      const response = await request(app).post('/api/generate').send({})

      // Should get a response from the generate route (not 404)
      expect(response.status).not.toBe(404)
    })

    it('should mount /status route', async () => {
      const response = await request(app).get('/api/status')

      // Should get a response from the status route (not 404)
      expect(response.status).not.toBe(404)
    })

    it('should mount /image route', async () => {
      const response = await request(app).get('/api/image/test-id')

      // Should get a response from the image route (not 404)
      expect(response.status).not.toBe(404)
    })
  })
})
