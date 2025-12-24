/**
 * Rate limiting middleware configuration
 * Protects API endpoints from abuse and DDoS attacks
 */

import rateLimit from 'express-rate-limit'
import { config } from '../config'

/**
 * Standard error message for rate limit exceeded
 */
const rateLimitMessage = {
  error: 'TooManyRequests',
  message: 'Too many requests, please try again later.'
}

/**
 * General rate limiter for all endpoints
 * Applies to all routes unless a more specific limiter is used
 */
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: rateLimitMessage,
  // Skip rate limiting in test environment
  skip: () => config.server.isTest
})

/**
 * Stricter rate limiter for the /api/generate endpoint
 * Lower limit since image generation is resource-intensive
 */
export const generateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.generateMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: `Too many generation requests. Maximum ${config.rateLimit.generateMax} requests per minute.`
  },
  skip: () => config.server.isTest
})
