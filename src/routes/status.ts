import { Router, Request, Response } from 'express'
import { getJobStatuses } from '../controllers/jobController'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  let jobIds: string[] = []

  if (typeof req.query.id === 'string') {
    jobIds = req.query.id.split(',')
  } else if (Array.isArray(req.query.id)) {
    jobIds = req.query.id.flatMap((id) =>
      typeof id === 'string' ? id.split(',') : []
    )
  }

  console.log('Received status request for jobs:', jobIds)
  const statuses = getJobStatuses(jobIds)
  console.log('Sending status response:', statuses)
  res.json(statuses)
})

export default router
