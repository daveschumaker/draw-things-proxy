/**
 * Constants and configuration values
 * @deprecated Use the config module from src/config instead
 */

import { config } from '../config'

export class Constants {
  // API server for DrawThings app on MacOS
  public static readonly API_URL = config.drawThings.apiUrl

  public static readonly DRAW_THINGS_IMAGE_DIR = config.drawThings.imageDir
  public static readonly SAVE_IMAGE_DIR = config.storage.saveImageDir
}
