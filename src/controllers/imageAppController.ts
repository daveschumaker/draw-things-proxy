/**
 * Controller for monitoring the health status of the DrawThings image generation application.
 * Tracks whether the DrawThings API server is accessible.
 */

import fetch from 'node-fetch'
import { config } from '../config'

let isAlive = false

/**
 * Checks if the DrawThings image generation application is running and accessible.
 * Updates the internal status flag based on the result.
 * This should be called periodically to maintain accurate status information.
 */
export const checkImageGenerationAppStatus = async (): Promise<void> => {
  try {
    const response = await fetch(config.drawThings.statusUrl)
    if (response.ok) {
      isAlive = true
    } else {
      isAlive = false
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  } catch (error) {
    isAlive = false
  }
}

/**
 * Returns the current status of the DrawThings image generation application.
 *
 * @returns true if the application is running and accessible, false otherwise
 */
export const getImageGenerationAppStatus = (): boolean => isAlive
