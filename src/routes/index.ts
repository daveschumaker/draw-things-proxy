import { Request, Response, Router } from 'express'
import generateRouter from './generate'
import imageRouter from './image'
import statusRouter from './status'
import { getImageGenerationAppStatus } from '../controllers/imageAppController'
import { sendSuccess } from '../utils/apiResponse'

const router = Router()

router.use('/generate', generateRouter)
router.use('/image', imageRouter)
router.use('/status', statusRouter)

router.get('/heartbeat', (req: Request, res: Response) => {
  const isAlive = getImageGenerationAppStatus()
  sendSuccess(res, { isAlive })
})

export default router
