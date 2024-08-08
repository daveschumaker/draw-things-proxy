import { Router, Request, Response } from 'express'
import path from 'path'
import { Constants } from '../models/constants'

const router = Router()
const imageDir = Constants.SAVE_IMAGE_DIR

router.get('/:id', (req: Request, res: Response) => {
  const imagePath = path.join(imageDir, `${req.params.id}.png`)
  let isRequestClosed = false

  // Listen for the 'aborted' event to handle client disconnection
  req.on('aborted', () => {
    isRequestClosed = true
    console.error(`Request aborted by the client for image ${req.params.id}`)
  })

  res.sendFile(imagePath, (err) => {
    if (isRequestClosed) return // Don't send response if request was aborted

    if (err) {
      if (!res.headersSent) {
        res.status(500).send('Error serving image')
      }
    }
  })
})

export default router
