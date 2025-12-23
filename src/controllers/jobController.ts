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

/**
 * Job status enum
 */
/* eslint-disable no-unused-vars */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
/* eslint-enable no-unused-vars */

interface Job {
  jobId: string
  payload: Partial<ImageProcessingConfig>
  retries: number
  status: JobStatus
  error?: string
  createdAt: number
  completedAt?: number
}

let queue: Job[] = []
const completedJobs: Map<string, Job> = new Map()
const MAX_RETRIES = 3
const COMPLETED_JOB_TTL = 3600000 // 1 hour in milliseconds
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

  const job: Job = {
    jobId,
    payload,
    retries: 0,
    status: JobStatus.PENDING,
    createdAt: Date.now()
  }

  queue.push(job)
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
 * Gets detailed status information for multiple jobs.
 * Checks both the active queue and completed jobs.
 *
 * @param jobIds - Array of job identifiers to check
 * @returns Array of objects containing detailed job status
 */
export function getJobStatuses(jobIds: string[]): {
  jobId: string
  position: number
  status: JobStatus
  error?: string
  createdAt?: number
  completedAt?: number
}[] {
  return jobIds.map((jobId) => {
    // Check queue first
    const queuePosition = queue.findIndex((job) => job.jobId === jobId)
    if (queuePosition !== -1) {
      const job = queue[queuePosition]
      return {
        jobId,
        position: queuePosition,
        status: job.status,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    }

    // Check completed jobs
    const completedJob = completedJobs.get(jobId)
    if (completedJob) {
      return {
        jobId,
        position: -1,
        status: completedJob.status,
        error: completedJob.error,
        createdAt: completedJob.createdAt,
        completedAt: completedJob.completedAt
      }
    }

    // Job not found
    return {
      jobId,
      position: -1,
      status: JobStatus.FAILED,
      error: 'Job not found'
    }
  })
}

interface ImageResponseSuccess {
  images: string[]
}

/**
 * Processes a single job by sending the request to the DrawThings API.
 * On connection errors, attempts to retrieve the image from the local filesystem.
 * Failed jobs are retried up to MAX_RETRIES times before being marked as failed.
 *
 * @param job - The job to process
 */
async function processJob(job: Job): Promise<void> {
  const targetUrl = Constants.API_URL

  // Mark job as processing
  job.status = JobStatus.PROCESSING

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

    // Mark job as completed and move to completed jobs
    job.status = JobStatus.COMPLETED
    job.completedAt = Date.now()
    completedJobs.set(job.jobId, job)

    // Clean up old completed jobs
    cleanupCompletedJobs()

    queue = queue.filter((queuedJob) => queuedJob.jobId !== job.jobId)
    console.log(
      `Job ${job.jobId} removed from queue. Queue length: ${queue.length}`
    )
  } catch (error) {
    console.error(`Error processing job ${job.jobId}:`, error)

    // Safe error type checking
    const isConnectionError =
      error &&
      typeof error === 'object' &&
      ('code' in error || 'type' in error) &&
      (error.code === 'ECONNRESET' || error.type === 'system')

    if (isConnectionError) {
      console.log(`Attempting to fetch local image for job ${job.jobId}`)
      try {
        const localImageBase64 = await getLocalImage(job.payload.seed)
        if (localImageBase64) {
          await saveImage(localImageBase64, job.jobId)
          console.log(
            `Job ${job.jobId} completed successfully with local image`
          )

          // Mark job as completed
          job.status = JobStatus.COMPLETED
          job.completedAt = Date.now()
          completedJobs.set(job.jobId, job)
          cleanupCompletedJobs()

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
      job.status = JobStatus.PENDING // Reset to pending for retry
      queue.push(job)
      console.log(
        `Retrying job ${job.jobId} (attempt ${job.retries}). Queue length: ${queue.length}`
      )
    } else {
      console.error(`Job ${job.jobId} failed after ${MAX_RETRIES} retries.`)

      // Mark job as failed and move to completed jobs
      job.status = JobStatus.FAILED
      job.completedAt = Date.now()
      job.error =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred during processing'
      completedJobs.set(job.jobId, job)
      cleanupCompletedJobs()

      queue = queue.filter((queuedJob) => queuedJob.jobId !== job.jobId)
      console.log(
        `Job ${job.jobId} removed from queue after max retries. Queue length: ${queue.length}`
      )
    }
  }
}

/**
 * Removes completed jobs that have exceeded the TTL
 */
function cleanupCompletedJobs(): void {
  const now = Date.now()
  for (const [jobId, job] of completedJobs.entries()) {
    if (job.completedAt && now - job.completedAt > COMPLETED_JOB_TTL) {
      completedJobs.delete(jobId)
      console.log(`Cleaned up completed job ${jobId}`)
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
  completedJobs.clear()
  isProcessing = false
}

export default { addJob, getJobPosition, getJobStatuses, startProcessing }
