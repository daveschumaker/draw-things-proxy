import { Router, Request, Response } from 'express'
import { getJobStatuses } from '../controllers/jobController'
import { validateQuery } from '../middleware/validation'
import { jobStatusQuerySchema } from '../models/schemas'
import { sendSuccess } from '../utils/apiResponse'
import { log } from '../utils/logger'

const router = Router()

router.get(
  '/',
  validateQuery(jobStatusQuerySchema),
  (req: Request, res: Response) => {
    const jobIds = req.query.id as string[]

    log.info('Received status request', { jobIds })
    const statuses = getJobStatuses(jobIds)
    log.debug('Sending status response', { statuses })

    sendSuccess(res, statuses)
  }
)

export default router
