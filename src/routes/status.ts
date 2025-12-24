import { Router, Request, Response } from 'express'
import { getJobStatuses } from '../controllers/jobController'
import { validateQuery } from '../middleware/validation'
import { jobStatusQuerySchema } from '../models/schemas'
import { sendSuccess } from '../utils/apiResponse'

const router = Router()

router.get(
  '/',
  validateQuery(jobStatusQuerySchema),
  (req: Request, res: Response) => {
    const jobIds = req.query.id as string[]

    console.log('Received status request for jobs:', jobIds)
    const statuses = getJobStatuses(jobIds)
    console.log('Sending status response:', statuses)

    sendSuccess(res, statuses)
  }
)

export default router
