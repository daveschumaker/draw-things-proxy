if (!process.env.SAVE_IMAGE_DIR) {
  throw new Error('SAVE_IMAGE_DIR environment variable is not set')
}

if (!process.env.DRAW_THINGS_IMAGE_DIR) {
  throw new Error('DRAW_THINGS_IMAGE_DIR environment variable is not set')
}

export class Constants {
  // API server for DrawThings app on MacOS
  public static readonly API_URL = 'http://127.0.0.1:7860/sdapi/v1/txt2img'

  public static readonly DRAW_THINGS_IMAGE_DIR =
    process.env.DRAW_THINGS_IMAGE_DIR
  public static readonly SAVE_IMAGE_DIR = process.env.SAVE_IMAGE_DIR
}
