import { Router, Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'
import { Constants } from '../models/constants'
import { NotFoundError, InternalServerError } from '../errors'
import { log } from '../utils/logger'
import { validateParams, validateQuery } from '../middleware/validation'
import { imageParamsSchema, imageQuerySchema } from '../models/schemas'

const router = Router()
const imageDir = Constants.SAVE_IMAGE_DIR

router.get(
  '/:id',
  validateParams(imageParamsSchema),
  validateQuery(imageQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const imagePath = path.join(imageDir, `${req.params.id}.png`)
      const { format, response } = req.query as {
        format: string
        response: string
      }
      let isRequestClosed = false

      // Listen for the 'aborted' event to handle client disconnection
      req.on('aborted', () => {
        isRequestClosed = true
        log.warn('Request aborted by client', { imageId: req.params.id })
      })

      // Check if file exists
      try {
        await fs.access(imagePath)
      } catch {
        return next(new NotFoundError(`Image not found: ${req.params.id}`))
      }

      // If request was aborted during file check, stop processing
      if (isRequestClosed) return

      // Read and convert image if needed
      let imageBuffer: Buffer
      const targetFormat = format === 'jpeg' ? 'jpg' : format

      if (format === 'png') {
        // No conversion needed, read directly
        imageBuffer = await fs.readFile(imagePath)
      } else {
        // Convert to requested format
        const sharpInstance = sharp(imagePath)

        if (targetFormat === 'webp') {
          imageBuffer = await sharpInstance.webp().toBuffer()
        } else if (targetFormat === 'jpg') {
          imageBuffer = await sharpInstance.jpeg().toBuffer()
        } else {
          imageBuffer = await fs.readFile(imagePath)
        }
      }

      // If request was aborted during conversion, stop processing
      if (isRequestClosed) return

      // Return based on response type
      if (response === 'base64') {
        const base64 = imageBuffer.toString('base64')
        const mimeType =
          targetFormat === 'webp'
            ? 'image/webp'
            : targetFormat === 'jpg'
              ? 'image/jpeg'
              : 'image/png'

        res.json({
          id: req.params.id,
          format: targetFormat,
          mimeType,
          data: base64
        })
      } else {
        // Return as file
        const contentType =
          targetFormat === 'webp'
            ? 'image/webp'
            : targetFormat === 'jpg'
              ? 'image/jpeg'
              : 'image/png'

        const extension = targetFormat === 'jpg' ? 'jpg' : targetFormat

        res.setHeader('Content-Type', contentType)
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${req.params.id}.${extension}"`
        )
        res.send(imageBuffer)
      }
    } catch (error) {
      if (!res.headersSent) {
        log.error('Error processing image', {
          imageId: req.params.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        next(
          new InternalServerError('Error processing image', {
            originalError:
              error instanceof Error ? error.message : 'Unknown error'
          })
        )
      }
    }
  }
)

export default router
