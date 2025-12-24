/**
 * Structured logging utility using Winston
 * Provides consistent logging with levels, timestamps, and metadata
 */

import winston from 'winston'
import { config } from '../config'

/**
 * Custom log format for development (simple, readable)
 */
const simpleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`
  })
)

/**
 * JSON format for production (machine-readable, structured)
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

/**
 * Winston logger instance
 * Configured based on environment settings
 */
export const logger = winston.createLogger({
  level: config.logging.level,
  format: config.logging.format === 'json' ? jsonFormat : simpleFormat,
  transports: [
    new winston.transports.Console({
      silent: config.server.isTest // Silence logs during tests
    })
  ],
  // Don't exit on error
  exitOnError: false
})

/**
 * Type-safe logging methods with metadata support
 */
export const log = {
  error: (message: string, meta?: Record<string, unknown>) =>
    logger.error(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    logger.warn(message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    logger.info(message, meta),
  http: (message: string, meta?: Record<string, unknown>) =>
    logger.http(message, meta),
  debug: (message: string, meta?: Record<string, unknown>) =>
    logger.debug(message, meta)
}
