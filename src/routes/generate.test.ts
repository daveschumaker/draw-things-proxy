/**
 * Tests for /generate route
 */

import request from 'supertest'
import express, { Express } from 'express'
import generateRouter from './generate'
import * as imageAppController from '../controllers/imageAppController'
import * as jobController from '../controllers/jobController'

jest.mock('../controllers/imageAppController')
jest.mock('../controllers/jobController')

describe('POST /generate', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/', generateRouter)
    jest.clearAllMocks()
  })

  it('should return 503 if image generation app is not running', async () => {
    jest
      .spyOn(imageAppController, 'getImageGenerationAppStatus')
      .mockReturnValue(false)

    const response = await request(app).post('/').send({ prompt: 'test' })

    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      error: 'Image generation app is not running'
    })
  })

  it('should add job and return jobId and position when app is running', async () => {
    const mockJobId = 'test-job-123'
    const mockPosition = 2

    jest
      .spyOn(imageAppController, 'getImageGenerationAppStatus')
      .mockReturnValue(true)
    jest.spyOn(jobController, 'addJob').mockReturnValue(mockJobId)
    jest.spyOn(jobController, 'getJobPosition').mockReturnValue(mockPosition)

    const payload = {
      prompt: 'test prompt',
      width: 512,
      height: 512
    }

    const response = await request(app).post('/').send(payload)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      jobId: mockJobId,
      position: mockPosition
    })
    expect(jobController.addJob).toHaveBeenCalledWith(payload)
    expect(jobController.getJobPosition).toHaveBeenCalledWith(mockJobId)
  })

  it('should handle job addition errors gracefully', async () => {
    jest
      .spyOn(imageAppController, 'getImageGenerationAppStatus')
      .mockReturnValue(true)
    jest.spyOn(jobController, 'addJob').mockImplementation(() => {
      throw new Error('Queue full')
    })

    const response = await request(app).post('/').send({ prompt: 'test' })

    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: 'Failed to add job' })
  })

  it('should accept minimal payload', async () => {
    const mockJobId = 'test-job-456'
    const mockPosition = 0

    jest
      .spyOn(imageAppController, 'getImageGenerationAppStatus')
      .mockReturnValue(true)
    jest.spyOn(jobController, 'addJob').mockReturnValue(mockJobId)
    jest.spyOn(jobController, 'getJobPosition').mockReturnValue(mockPosition)

    const response = await request(app).post('/').send({ prompt: 'test' })

    expect(response.status).toBe(200)
    expect(response.body.jobId).toBe(mockJobId)
  })

  it('should accept complex payload with all parameters', async () => {
    const mockJobId = 'test-job-789'
    const mockPosition = 5

    jest
      .spyOn(imageAppController, 'getImageGenerationAppStatus')
      .mockReturnValue(true)
    jest.spyOn(jobController, 'addJob').mockReturnValue(mockJobId)
    jest.spyOn(jobController, 'getJobPosition').mockReturnValue(mockPosition)

    const complexPayload = {
      prompt: 'complex test prompt',
      negative_prompt: 'bad quality',
      width: 1024,
      height: 1024,
      steps: 50,
      seed: 123456,
      guidance_scale: 7.5,
      sampler: 'euler_a'
    }

    const response = await request(app).post('/').send(complexPayload)

    expect(response.status).toBe(200)
    expect(jobController.addJob).toHaveBeenCalledWith(complexPayload)
  })
})
