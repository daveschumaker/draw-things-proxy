import { Router, Request, Response } from 'express'
import { addJob, getJobPosition } from '../controllers/jobController'
import { getImageGenerationAppStatus } from '../controllers/imageAppController'
import { validateBody } from '../middleware/validation'
import { imageGenerationSchema } from '../models/schemas'
import { asyncHandler } from '../middleware/errorHandler'
import { sendSuccess } from '../utils/apiResponse'
import { ServiceUnavailableError } from '../errors'

const router = Router()

router.post(
  '/',
  validateBody(imageGenerationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    if (!getImageGenerationAppStatus()) {
      throw new ServiceUnavailableError('Image generation app is not running')
    }

    console.log('Received generate request:', req.body)
    const jobId = addJob(req.body)
    const position = getJobPosition(jobId)
    console.log(`Job ${jobId} added at position ${position}`)

    sendSuccess(res, { jobId, position }, 201, 'Job added to queue')
  })
)

export default router
