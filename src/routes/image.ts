import { Router, Request, Response, NextFunction } from 'express'
import path from 'path'
import { Constants } from '../models/constants'
import { NotFoundError, InternalServerError } from '../errors'
import { log } from '../utils/logger'

const router = Router()
const imageDir = Constants.SAVE_IMAGE_DIR

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  const imagePath = path.join(imageDir, `${req.params.id}.png`)
  let isRequestClosed = false

  // Listen for the 'aborted' event to handle client disconnection
  req.on('aborted', () => {
    isRequestClosed = true
    log.warn('Request aborted by client', { imageId: req.params.id })
  })

  res.sendFile(imagePath, (err) => {
    if (isRequestClosed) return // Don't send response if request was aborted

    if (err) {
      if (!res.headersSent) {
        // Check if file not found by error code
        if ('code' in err && err.code === 'ENOENT') {
          next(new NotFoundError(`Image not found: ${req.params.id}`))
        } else {
          next(new InternalServerError('Error serving image', { originalError: err.message }))
        }
      }
    }
  })
})

export default router
