import fs from 'fs'
import path from 'path'
import { Constants } from '../models/constants'

export async function saveImage(
  base64Image: string,
  jobId: string
): Promise<void> {
  try {
    const imageDir = Constants.SAVE_IMAGE_DIR
    console.log(`Attempting to save image for job ${jobId}`)
    await fs.promises.mkdir(imageDir, { recursive: true })

    const buffer = Buffer.from(base64Image, 'base64')
    const imagePath = path.join(imageDir, `${jobId}.png`)
    await fs.promises.writeFile(imagePath, buffer)
    console.log(`Image saved successfully: ${imagePath}`)
  } catch (error) {
    console.error(`Error saving image for job ${jobId}:`, error)
    throw error
  }
}
