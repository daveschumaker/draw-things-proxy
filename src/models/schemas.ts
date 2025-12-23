/**
 * Validation schemas for API requests using Zod
 */

import { z } from 'zod'

/**
 * Schema for image generation request payload
 * Validates all required and optional parameters for the DrawThings API
 */
export const imageGenerationSchema = z.object({
  // Required fields
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt too long'),

  // Optional fields with validation
  negative_prompt: z.string().max(2000).optional(),
  width: z.number().int().min(64).max(2048).optional(),
  height: z.number().int().min(64).max(2048).optional(),
  steps: z.number().int().min(1).max(150).optional(),
  seed: z.number().int().min(-1).max(4294967295).optional(),
  batch_size: z.number().int().min(1).max(8).optional(),
  batch_count: z.number().int().min(1).max(100).optional(),

  // Guidance and scaling
  guidance_scale: z.number().min(0).max(30).optional(),
  guidance_embed: z.number().optional(),
  image_guidance: z.number().optional(),
  stage_2_guidance: z.number().optional(),
  start_frame_guidance: z.number().optional(),

  // Sampler and model
  sampler: z.string().max(50).optional(),
  model: z.string().max(100).optional(),
  refiner_model: z.string().max(100).optional(),
  refiner_start: z.number().min(0).max(1).optional(),

  // Dimensions and cropping
  original_width: z.number().int().min(0).optional(),
  original_height: z.number().int().min(0).optional(),
  target_width: z.number().int().min(0).optional(),
  target_height: z.number().int().min(0).optional(),
  crop_left: z.number().int().min(0).optional(),
  crop_top: z.number().int().min(0).optional(),

  // Negative dimensions
  negative_original_width: z.number().int().optional(),
  negative_original_height: z.number().int().optional(),

  // Advanced settings
  strength: z.number().min(0).max(1).optional(),
  clip_skip: z.number().int().min(0).max(12).optional(),
  clip_weight: z.number().optional(),
  aesthetic_score: z.number().optional(),
  negative_aesthetic_score: z.number().optional(),
  sharpness: z.number().optional(),
  shift: z.number().optional(),
  stage_2_shift: z.number().optional(),
  fps: z.number().int().min(1).max(60).optional(),
  num_frames: z.number().int().min(1).optional(),
  motion_scale: z.number().optional(),
  guiding_frame_noise: z.number().optional(),

  // Boolean flags
  hires_fix: z.boolean().optional(),
  tiled_decoding: z.boolean().optional(),
  tiled_diffusion: z.boolean().optional(),
  speed_up_with_guidance_embed: z.boolean().optional(),
  negative_prompt_for_image_prior: z.boolean().optional(),
  zero_negative_prompt: z.boolean().optional(),
  preserve_original_after_inpaint: z.boolean().optional(),
  separate_clip_l: z.boolean().optional(),
  separate_open_clip_g: z.boolean().optional(),
  t5_text_encoder_decoding: z.boolean().optional(),

  // Hires fix settings
  hires_fix_width: z.number().int().min(0).optional(),
  hires_fix_height: z.number().int().min(0).optional(),
  hires_fix_strength: z.number().min(0).max(1).optional(),

  // Tiling settings
  decoding_tile_width: z.number().int().min(0).optional(),
  decoding_tile_height: z.number().int().min(0).optional(),
  decoding_tile_overlap: z.number().int().min(0).optional(),
  diffusion_tile_width: z.number().int().min(0).optional(),
  diffusion_tile_height: z.number().int().min(0).optional(),
  diffusion_tile_overlap: z.number().int().min(0).optional(),

  // Mask settings
  mask_blur: z.number().min(0).optional(),
  mask_blur_outset: z.number().min(0).optional(),

  // Image prior and upscaler
  image_prior_steps: z.number().int().min(0).optional(),
  upscaler: z.string().max(50).nullable().optional(),
  upscaler_scale: z.number().min(1).max(4).optional(),

  // Sampling settings
  seed_mode: z.string().max(50).optional(),
  stochastic_sampling_gamma: z.number().optional(),

  // Text encoders
  clip_l_text: z.string().max(2000).nullable().optional(),
  open_clip_g_text: z.string().max(2000).nullable().optional(),

  // Arrays (LoRAs and controls)
  loras: z.array(z.any()).optional(),
  controls: z.array(z.any()).optional()
})

/**
 * Schema for job status query
 * Validates the job ID query parameter
 */
export const jobStatusQuerySchema = z.object({
  id: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      if (typeof val === 'string') {
        return val.split(',').filter((id) => id.length > 0)
      }
      return val.flatMap((id) =>
        typeof id === 'string' ? id.split(',').filter((v) => v.length > 0) : []
      )
    })
    .optional()
    .default([])
})

/**
 * Type inference from schemas
 */
export type ImageGenerationRequest = z.infer<typeof imageGenerationSchema>
export type JobStatusQuery = z.infer<typeof jobStatusQuerySchema>
