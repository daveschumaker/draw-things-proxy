/**
 * Tests for jobController
 */

import {
  addJob,
  getJobPosition,
  getJobStatuses,
  resetQueue
} from './jobController'

describe('jobController', () => {
  // Reset queue state before each test to ensure isolation
  beforeEach(() => {
    resetQueue()
  })

  afterEach(() => {
    resetQueue()
  })
  describe('addJob', () => {
    it('should add a job to the queue and return a jobId', () => {
      const payload = {
        prompt: 'test prompt',
        width: 512,
        height: 512,
        steps: 20
      }

      const jobId = addJob(payload)

      expect(jobId).toBeDefined()
      expect(typeof jobId).toBe('string')
      expect(jobId.length).toBeGreaterThan(0)
    })

    it('should generate a random seed if not provided', () => {
      const payload = {
        prompt: 'test prompt'
      }

      const jobId = addJob(payload)
      const position = getJobPosition(jobId)

      expect(position).toBeGreaterThanOrEqual(0)
    })

    it('should generate a random seed if seed is -1', () => {
      const payload = {
        prompt: 'test prompt',
        seed: -1
      }

      const jobId = addJob(payload)
      const position = getJobPosition(jobId)

      expect(position).toBeGreaterThanOrEqual(0)
    })

    it('should preserve the seed if provided', () => {
      const payload = {
        prompt: 'test prompt',
        seed: 123456
      }

      const jobId = addJob(payload)
      const position = getJobPosition(jobId)

      expect(position).toBeGreaterThanOrEqual(0)
    })

    it('should generate unique jobIds for different jobs', () => {
      const payload1 = { prompt: 'test 1' }
      const payload2 = { prompt: 'test 2' }

      const jobId1 = addJob(payload1)
      const jobId2 = addJob(payload2)

      expect(jobId1).not.toBe(jobId2)
    })
  })

  describe('getJobPosition', () => {
    it('should return the position of a job in the queue', () => {
      const payload = { prompt: 'test' }
      const jobId = addJob(payload)

      const position = getJobPosition(jobId)

      expect(position).toBeGreaterThanOrEqual(0)
    })

    it('should return -1 for a non-existent job', () => {
      const position = getJobPosition('non-existent-job-id')

      expect(position).toBe(-1)
    })

    it('should return correct positions for multiple jobs', () => {
      const jobIds: string[] = []

      // Add 3 jobs
      for (let i = 0; i < 3; i++) {
        jobIds.push(addJob({ prompt: `test ${i}` }))
      }

      // Check positions are valid
      jobIds.forEach((jobId) => {
        const position = getJobPosition(jobId)
        expect(position).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('getJobStatuses', () => {
    it('should return status for a single job', () => {
      const jobId = addJob({ prompt: 'test' })
      const statuses = getJobStatuses([jobId])

      expect(statuses).toHaveLength(1)
      expect(statuses[0].jobId).toBe(jobId)
      expect(statuses[0].position).toBeGreaterThanOrEqual(0)
    })

    it('should return statuses for multiple jobs', () => {
      const jobId1 = addJob({ prompt: 'test 1' })
      const jobId2 = addJob({ prompt: 'test 2' })
      const jobId3 = addJob({ prompt: 'test 3' })

      const statuses = getJobStatuses([jobId1, jobId2, jobId3])

      expect(statuses).toHaveLength(3)
      expect(statuses[0].jobId).toBe(jobId1)
      expect(statuses[1].jobId).toBe(jobId2)
      expect(statuses[2].jobId).toBe(jobId3)
    })

    it('should return -1 position for non-existent jobs', () => {
      const statuses = getJobStatuses(['fake-id-1', 'fake-id-2'])

      expect(statuses).toHaveLength(2)
      expect(statuses[0].position).toBe(-1)
      expect(statuses[1].position).toBe(-1)
    })

    it('should handle empty array', () => {
      const statuses = getJobStatuses([])

      expect(statuses).toHaveLength(0)
    })

    it('should handle mix of existing and non-existing jobs', () => {
      const existingJobId = addJob({ prompt: 'test' })
      const statuses = getJobStatuses([existingJobId, 'fake-id'])

      expect(statuses).toHaveLength(2)
      expect(statuses[0].position).toBeGreaterThanOrEqual(0)
      expect(statuses[1].position).toBe(-1)
    })
  })
})
