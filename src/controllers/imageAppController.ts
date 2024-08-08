import fetch from 'node-fetch'

let isAlive = false

export const checkImageGenerationAppStatus = async () => {
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

export const getImageGenerationAppStatus = () => isAlive
