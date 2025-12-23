import { Router, Request, Response } from 'express'
import { addJob, getJobPosition } from '../controllers/jobController'
import { getImageGenerationAppStatus } from '../controllers/imageAppController'
import { validateBody } from '../middleware/validation'
import { imageGenerationSchema } from '../models/schemas'

const router = Router()

router.post(
  '/',
  validateBody(imageGenerationSchema),
  async (req: Request, res: Response) => {
    if (!getImageGenerationAppStatus()) {
      return res
        .status(503)
        .json({ error: 'Image generation app is not running' })
    }

    try {
      console.log('Received generate request:', req.body)
      const jobId = addJob(req.body)
      const position = getJobPosition(jobId)
      console.log(`Job ${jobId} added at position ${position}`)
      res.json({ jobId, position })
    } catch (error) {
      console.error('Error adding job:', error)
      res.status(500).json({ error: 'Failed to add job' })
    }
  }
)

export default router
