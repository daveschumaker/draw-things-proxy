import crypto from 'crypto'
import http from 'http'
import fetch from 'node-fetch'
import { saveImage } from '../utils/imageUtils'
import fs from 'fs'
import path from 'path'
import { Constants } from '../models/constants'

type ImageProcessingConfig = {
  negative_original_height: number
  tiled_decoding: boolean
  refiner_model: string
  guidance_embed: number
  sampler: string
  hires_fix_width: number
  height: number
  diffusion_tile_overlap: number
  start_frame_guidance: number
  target_height: number
  sharpness: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loras: any[] // Assuming 'loras' is an array of any type, you can specify the type if known
  hires_fix_strength: number
  clip_weight: number
  negative_prompt: string
  hires_fix_height: number
  guidance_scale: number
  target_width: number
  seed_mode: string
  steps: number
  decoding_tile_height: number
  negative_prompt_for_image_prior: boolean
  strength: number
  negative_aesthetic_score: number
  model: string
  diffusion_tile_height: number
  mask_blur_outset: number
  stage_2_shift: number
  aesthetic_score: number
  tiled_diffusion: boolean
  shift: number
  t5_text_encoder_decoding: boolean
  decoding_tile_width: number
  image_prior_steps: number
  speed_up_with_guidance_embed: boolean
  stochastic_sampling_gamma: number
  motion_scale: number
  separate_clip_l: boolean
  prompt: string
  width: number
  stage_2_guidance: number
  clip_l_text: string | null
  image_guidance: number
  original_height: number
  fps: number
  upscaler: string | null
  preserve_original_after_inpaint: boolean
  separate_open_clip_g: boolean
  decoding_tile_overlap: number
  original_width: number
  crop_left: number
  negative_original_width: number
  seed: number
  open_clip_g_text: string | null
  clip_skip: number
  mask_blur: number
  crop_top: number
  batch_size: number
  upscaler_scale: number
  guiding_frame_noise: number
  batch_count: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controls: any[] // Assuming 'controls' is an array of any type, you can specify the type if known
  zero_negative_prompt: boolean
  hires_fix: boolean
  diffusion_tile_width: number
  refiner_start: number
  num_frames: number
}

interface Job {
  jobId: string
  payload: Partial<ImageProcessingConfig>
  retries: number
}

let queue: Job[] = []
const MAX_RETRIES = 3
let isProcessing = false

const agent = new http.Agent({
  keepAlive: true
})

/**
 * Creates a hash from the provided data using the shake256 algorithm.
 *
 * @param data - The string data to hash
 * @param len - The desired output length in bytes
 * @returns A hexadecimal hash string
 */
function createHash(data: string, len: number): string {
  return crypto
    .createHash('shake256', { outputLength: len })
    .update(data)
    .digest('hex')
}

/**
 * Adds a new image generation job to the queue.
 * If no seed is provided or seed is -1, a random seed will be generated.
 *
 * @param payload - The image processing configuration
 * @returns The unique job ID for tracking the job status
 */
export function addJob(payload: Partial<ImageProcessingConfig>): string {
  if (!payload.seed || payload.seed === -1) {
    payload.seed = Math.floor(Math.random() * 4294967295) + 1
  }

  // Include random component to ensure uniqueness even for concurrent requests
  const uniqueString = `${Date.now()}-${Math.random()}`
  const jobId = createHash(uniqueString, 10)
  queue.push({ jobId, payload, retries: 0 })
  console.log(`Job ${jobId} added to queue. Queue length: ${queue.length}`)
  return jobId
}

/**
 * Gets the position of a job in the queue.
 *
 * @param jobId - The unique job identifier
 * @returns The zero-based position in the queue, or -1 if not found
 */
export function getJobPosition(jobId: string): number {
  return queue.findIndex((job) => job.jobId === jobId)
}

/**
 * Gets the queue positions for multiple jobs.
 *
 * @param jobIds - Array of job identifiers to check
 * @returns Array of objects containing jobId and position
 */
export function getJobStatuses(
  jobIds: string[]
): { jobId: string; position: number }[] {
  return jobIds.map((jobId) => ({
    jobId,
    position: getJobPosition(jobId)
  }))
}

interface ImageResponseSuccess {
  images: string[]
}

/**
 * Processes a single job by sending the request to the DrawThings API.
 * On connection errors, attempts to retrieve the image from the local filesystem.
 * Failed jobs are retried up to MAX_RETRIES times before being removed from the queue.
 *
 * @param job - The job to process
 */
async function processJob(job: Job): Promise<void> {
  const targetUrl = Constants.API_URL

  try {
    console.log(`Processing job ${job.jobId}`)
    const response = await fetch(targetUrl, {
      agent,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job.payload)
    })
    if (!response.ok) throw new Error(`Error: ${response.statusText}`)

    const data = (await response.json()) as ImageResponseSuccess
    if (!data.images || data.images.length === 0) {
      throw new Error('No image data received from the API')
    }

    await saveImage(data.images[0], job.jobId)
    console.log(`Job ${job.jobId} completed successfully`)

    queue = queue.filter((queuedJob) => queuedJob.jobId !== job.jobId)
    console.log(
      `Job ${job.jobId} removed from queue. Queue length: ${queue.length}`
    )
  } catch (error) {
    console.error(`Error processing job ${job.jobId}:`, error)

    if (error.code === 'ECONNRESET' || error.type === 'system') {
      console.log(`Attempting to fetch local image for job ${job.jobId}`)
      try {
        const localImageBase64 = await getLocalImage(job.payload.seed)
        if (localImageBase64) {
          await saveImage(localImageBase64, job.jobId)
          console.log(
            `Job ${job.jobId} completed successfully with local image`
          )
          queue = queue.filter((queuedJob) => queuedJob.jobId !== job.jobId)
          return
        }
      } catch (localError) {
        console.error(
          `Error fetching local image for job ${job.jobId}:`,
          localError
        )
      }
    }

    if (job.retries < MAX_RETRIES) {
      job.retries++
      queue.push(job)
      console.log(
        `Retrying job ${job.jobId} (attempt ${job.retries}). Queue length: ${queue.length}`
      )
    } else {
      console.error(`Job ${job.jobId} failed after ${MAX_RETRIES} retries.`)
      queue = queue.filter((queuedJob) => queuedJob.jobId !== job.jobId)
      console.log(
        `Job ${job.jobId} removed from queue after max retries. Queue length: ${queue.length}`
      )
    }
  }
}

/**
 * Attempts to retrieve a locally generated image from the DrawThings output directory.
 * This serves as a fallback when the API connection fails but the image was still generated.
 *
 * @param seed - The seed value used to generate the image
 * @returns Base64-encoded image data if found, null otherwise
 */
async function getLocalImage(seed: number): Promise<string | null> {
  const directory = Constants.DRAW_THINGS_IMAGE_DIR
  const files = await fs.promises.readdir(directory)

  const matchingFiles = files.filter((file) => file.endsWith(`${seed}.png`))

  const fileStats = await Promise.all(
    matchingFiles.map(async (file) => ({
      file,
      mtime: (
        await fs.promises.stat(path.join(directory, file))
      ).mtime.getTime()
    }))
  )

  // Sort by modification time, most recent first
  fileStats.sort((a, b) => b.mtime - a.mtime)

  if (fileStats.length > 0) {
    const mostRecentFile = fileStats[0].file
    const filePath = path.join(directory, mostRecentFile)
    const fileBuffer = await fs.promises.readFile(filePath)
    return fileBuffer.toString('base64')
  }

  return null
}

/**
 * Processes the next job in the queue.
 * Uses a setTimeout chain to ensure jobs are processed sequentially
 * without race conditions.
 */
async function processQueue(): Promise<void> {
  if (isProcessing || queue.length === 0) {
    // If no jobs to process, check again in 2 seconds
    if (!isProcessing && queue.length === 0) {
      setTimeout(() => processQueue(), 2000)
    }
    return
  }

  isProcessing = true
  const job = queue[0]
  await processJob(job)
  isProcessing = false

  // Process next job after a 1 second delay
  setTimeout(() => processQueue(), 1000)
}

/**
 * Starts the job queue processing loop.
 * This should be called once on application startup.
 */
function startProcessing(): void {
  processQueue()
}

/**
 * Resets the job queue state. FOR TESTING PURPOSES ONLY.
 * @internal
 */
export function resetQueue(): void {
  queue = []
  isProcessing = false
}

export default { addJob, getJobPosition, getJobStatuses, startProcessing }
