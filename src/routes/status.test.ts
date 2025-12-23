/**
 * Tests for /status route
 */

import request from 'supertest'
import express, { Express } from 'express'
import statusRouter from './status'
import * as jobController from '../controllers/jobController'
import { JobStatus } from '../controllers/jobController'

jest.mock('../controllers/jobController')

describe('GET /status', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/', statusRouter)
    jest.clearAllMocks()
  })

  it('should return status for a single job id', async () => {
    const mockStatuses = [
      {
        jobId: 'job-123',
        position: 0,
        status: JobStatus.PENDING,
        createdAt: Date.now()
      }
    ]
    jest.spyOn(jobController, 'getJobStatuses').mockReturnValue(mockStatuses)

    const response = await request(app).get('/').query({ id: 'job-123' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(mockStatuses)
    expect(jobController.getJobStatuses).toHaveBeenCalledWith(['job-123'])
  })

  it('should handle comma-separated job ids', async () => {
    const now = Date.now()
    const mockStatuses = [
      {
        jobId: 'job-1',
        position: 0,
        status: JobStatus.PENDING,
        createdAt: now
      },
      {
        jobId: 'job-2',
        position: 1,
        status: JobStatus.PENDING,
        createdAt: now
      },
      { jobId: 'job-3', position: 2, status: JobStatus.PENDING, createdAt: now }
    ]
    jest.spyOn(jobController, 'getJobStatuses').mockReturnValue(mockStatuses)

    const response = await request(app)
      .get('/')
      .query({ id: 'job-1,job-2,job-3' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(mockStatuses)
    expect(jobController.getJobStatuses).toHaveBeenCalledWith([
      'job-1',
      'job-2',
      'job-3'
    ])
  })

  it('should handle array of job ids', async () => {
    const now = Date.now()
    const mockStatuses = [
      {
        jobId: 'job-a',
        position: 0,
        status: JobStatus.PENDING,
        createdAt: now
      },
      { jobId: 'job-b', position: 1, status: JobStatus.PENDING, createdAt: now }
    ]
    jest.spyOn(jobController, 'getJobStatuses').mockReturnValue(mockStatuses)

    const response = await request(app)
      .get('/')
      .query({ id: ['job-a', 'job-b'] })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(mockStatuses)
    expect(jobController.getJobStatuses).toHaveBeenCalledWith([
      'job-a',
      'job-b'
    ])
  })

  it('should handle empty query parameter', async () => {
    const mockStatuses: {
      jobId: string
      position: number
      status: JobStatus
      createdAt?: number
    }[] = []
    jest.spyOn(jobController, 'getJobStatuses').mockReturnValue(mockStatuses)

    const response = await request(app).get('/')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(mockStatuses)
    expect(jobController.getJobStatuses).toHaveBeenCalledWith([])
  })

  it('should handle array with comma-separated values', async () => {
    const now = Date.now()
    const mockStatuses = [
      {
        jobId: 'job-1',
        position: 0,
        status: JobStatus.PENDING,
        createdAt: now
      },
      {
        jobId: 'job-2',
        position: 1,
        status: JobStatus.PENDING,
        createdAt: now
      },
      { jobId: 'job-3', position: 2, status: JobStatus.PENDING, createdAt: now }
    ]
    jest.spyOn(jobController, 'getJobStatuses').mockReturnValue(mockStatuses)

    const response = await request(app)
      .get('/')
      .query({ id: ['job-1,job-2', 'job-3'] })

    expect(response.status).toBe(200)
    expect(jobController.getJobStatuses).toHaveBeenCalledWith([
      'job-1',
      'job-2',
      'job-3'
    ])
  })

  it('should return status with -1 position for non-existent jobs', async () => {
    const mockStatuses = [
      {
        jobId: 'fake-job',
        position: -1,
        status: JobStatus.FAILED,
        error: 'Job not found'
      }
    ]
    jest.spyOn(jobController, 'getJobStatuses').mockReturnValue(mockStatuses)

    const response = await request(app).get('/').query({ id: 'fake-job' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(mockStatuses)
  })
})
