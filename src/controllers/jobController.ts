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

function createHash(data: string, len: number): string {
  return crypto
    .createHash('shake256', { outputLength: len })
    .update(data)
    .digest('hex')
}

export function addJob(payload: Partial<ImageProcessingConfig>): string {
  if (!payload.seed || payload.seed === -1) {
    payload.seed = Math.floor(Math.random() * 4294967295) + 1
  }

  const jobId = createHash(String(Date.now()), 10)
  queue.push({ jobId, payload, retries: 0 })
  console.log(`Job ${jobId} added to queue. Queue length: ${queue.length}`)
  return jobId
}

export function getJobPosition(jobId: string): number {
  return queue.findIndex((job) => job.jobId === jobId)
}

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

  fileStats.sort((a, b) => b.mtime - a.mtime)

  if (fileStats.length > 0) {
    const mostRecentFile = fileStats[0].file
    const filePath = path.join(directory, mostRecentFile)
    const fileBuffer = await fs.promises.readFile(filePath)
    return fileBuffer.toString('base64')
  }

  return null
}

async function processQueue() {
  if (isProcessing || queue.length === 0) return

  isProcessing = true
  const job = queue[0]
  await processJob(job)
  isProcessing = false

  // Schedule the next job processing
  setTimeout(() => processQueue(), 1000)
}

function startProcessing() {
  setInterval(() => processQueue(), 2000)
}

export default { addJob, getJobPosition, getJobStatuses, startProcessing }
