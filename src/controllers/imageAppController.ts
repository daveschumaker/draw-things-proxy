/**
 * Controller for monitoring the health status of the DrawThings image generation application.
 * Tracks whether the DrawThings API server is accessible on localhost:7860.
 */

import fetch from 'node-fetch'

let isAlive = false

/**
 * Checks if the DrawThings image generation application is running and accessible.
 * Updates the internal status flag based on the result.
 * This should be called periodically to maintain accurate status information.
 */
export const checkImageGenerationAppStatus = async (): Promise<void> => {
  try {
    const response = await fetch('http://localhost:7860')
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
