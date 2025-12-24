/**
 * Environment configuration with validation
 * Loads and validates environment variables using Zod
 */

import { z } from 'zod'
import dotenv from 'dotenv'

// Load .env file
dotenv.config()

/**
 * Environment variable schema
 * All configuration with defaults and validation rules
 */
const envSchema = z.object({
  // Server configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('localhost'),

  // API configuration
  DRAW_THINGS_API_URL: z
    .string()
    .url()
    .default('http://127.0.0.1:7860/sdapi/v1/txt2img'),
  DRAW_THINGS_STATUS_URL: z
    .string()
    .url()
    .default('http://127.0.0.1:7860/'),

  // Directory configuration
  SAVE_IMAGE_DIR: z.string().min(1),
  DRAW_THINGS_IMAGE_DIR: z.string().min(1),

  // Job queue configuration
  MAX_JOB_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
  COMPLETED_JOB_TTL_MS: z.coerce.number().int().min(0).default(3600000), // 1 hour
  QUEUE_PROCESS_DELAY_MS: z.coerce.number().int().min(0).default(1000),
  QUEUE_POLL_INTERVAL_MS: z.coerce.number().int().min(0).default(2000),

  // Health check configuration
  HEALTH_CHECK_INTERVAL_MS: z.coerce.number().int().min(1000).default(60000),

  // Request limits
  REQUEST_BODY_SIZE_LIMIT: z.string().default('1mb'),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(0).default(30000),

  // CORS configuration
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z.coerce.boolean().default(false)
})

/**
 * Parse and validate environment variables
 * Throws an error with detailed messages if validation fails
 */
function parseEnv() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Environment variable validation failed:')
    console.error(result.error.format())
    throw new Error('Invalid environment configuration')
  }

  return result.data
}

/**
 * Validated environment configuration
 * This object is frozen to prevent runtime modifications
 */
export const env = Object.freeze(parseEnv())

/**
 * Type for environment configuration
 */
export type Env = typeof env
