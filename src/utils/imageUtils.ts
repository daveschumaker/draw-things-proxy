/**
 * Utility functions for handling image storage operations.
 */

import fs from 'fs'
import path from 'path'
import { Constants } from '../models/constants'
import { log } from './logger'

/**
 * Saves a base64-encoded image to the filesystem.
 * Creates the output directory if it doesn't exist.
 *
 * @param base64Image - The base64-encoded image data (without the data URI prefix)
 * @param jobId - The unique job identifier to use as the filename
 * @throws Error if the image cannot be saved to disk
 */
export async function saveImage(
  base64Image: string,
  jobId: string
): Promise<void> {
  try {
    const imageDir = Constants.SAVE_IMAGE_DIR
    log.debug('Attempting to save image', { jobId })
    await fs.promises.mkdir(imageDir, { recursive: true })

    const buffer = Buffer.from(base64Image, 'base64')
    const imagePath = path.join(imageDir, `${jobId}.png`)
    await fs.promises.writeFile(imagePath, buffer)
    log.info('Image saved successfully', { jobId, imagePath })
  } catch (error) {
    log.error('Error saving image', { jobId, error })
    throw error
  }
}
