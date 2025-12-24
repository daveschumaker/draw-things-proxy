/**
 * Central configuration module
 * Provides type-safe access to all application configuration
 */

import { env } from './env'

/**
 * Application configuration object
 * Organized by domain for easy access
 */
export const config = {
  /**
   * Server configuration
   */
  server: {
    env: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test'
  },

  /**
   * DrawThings API configuration
   */
  drawThings: {
    apiUrl: env.DRAW_THINGS_API_URL,
    statusUrl: env.DRAW_THINGS_STATUS_URL,
    imageDir: env.DRAW_THINGS_IMAGE_DIR
  },

  /**
   * Image storage configuration
   */
  storage: {
    saveImageDir: env.SAVE_IMAGE_DIR
  },

  /**
   * Job queue configuration
   */
  queue: {
    maxRetries: env.MAX_JOB_RETRIES,
    completedJobTTL: env.COMPLETED_JOB_TTL_MS,
    processDelay: env.QUEUE_PROCESS_DELAY_MS,
    pollInterval: env.QUEUE_POLL_INTERVAL_MS
  },

  /**
   * Health check configuration
   */
  health: {
    checkInterval: env.HEALTH_CHECK_INTERVAL_MS
  },

  /**
   * Request configuration
   */
  request: {
    bodySizeLimit: env.REQUEST_BODY_SIZE_LIMIT,
    timeout: env.REQUEST_TIMEOUT_MS
  },

  /**
   * Rate limiting configuration
   */
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    generateMax: env.RATE_LIMIT_GENERATE_MAX
  },

  /**
   * Logging configuration
   */
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT
  },

  /**
   * CORS configuration
   */
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: env.CORS_CREDENTIALS
  }
} as const

/**
 * Type for the configuration object
 */
export type Config = typeof config
