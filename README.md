# DrawThingsProxy

A NodeJS + Express + TypeScript server that proxies requests to the [DrawThings](https://drawthings.ai/) MacOS app API with queue management, rate limiting, and image format conversion.

## Features

- **Queue Management**: Handles concurrent image generation requests with position tracking
- **Rate Limiting**: Protection against API abuse with configurable limits
- **Image Format Conversion**: Convert generated images to PNG, WebP, or JPEG formats
- **Base64 Response**: Option to receive images as base64-encoded JSON
- **Input Validation**: Comprehensive validation with Zod schemas
- **Structured Logging**: Winston-based logging with configurable formats
- **Error Handling**: Centralized error handling with detailed error responses

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the project root with the following variables:

```bash
# Server Configuration
PORT=3000                              # Server port (default: 3000)
NODE_ENV=development                   # Environment: development, production, test

# DrawThings API
DRAW_THINGS_IMAGE_DIR=/path/to/images  # Directory where DrawThings saves images
API_URL=http://localhost:7860          # DrawThings API URL
SAVE_IMAGE_DIR=/path/to/save/images    # Directory to save generated images

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000            # Rate limit window in ms (default: 60000 = 1 min)
RATE_LIMIT_MAX_REQUESTS=100           # Max requests per window (default: 100)
RATE_LIMIT_GENERATE_MAX=10            # Max generation requests per window (default: 10)

# Logging
LOG_LEVEL=info                         # Logging level: error, warn, info, http, debug
LOG_FORMAT=simple                      # Log format: simple (dev) or json (prod)
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Testing

```bash
npm test
```

## API Endpoints

### POST /api/generate

Generate an image using the DrawThings API.

**Request Body:**

```json
{
  "prompt": "a beautiful sunset over mountains",
  "negative_prompt": "blurry, low quality",
  "width": 512,
  "height": 512,
  "steps": 30,
  "guidance_scale": 7.5,
  "seed": -1,
  "batch_size": 1,
  "model": "sd_xl_base_1.0.safetensors"
}
```

**Response:**

```json
{
  "jobId": "abc123def456",
  "position": 1
}
```

**Parameter Defaults:**

The proxy forwards all parameters directly to DrawThings without setting defaults (except for `seed`). This means:

- **Omitted parameters**: DrawThings will use its own internal defaults
- **Seed handling**: If not provided or set to `-1`, the proxy generates a random seed (1-4294967295)
- **All other parameters**: Passed through as-is to DrawThings

This approach ensures flexibility and allows DrawThings to control its own defaults without requiring the proxy to be updated when DrawThings changes.

**Available Parameters:**

See the [complete parameter list](src/models/schemas.ts) for all supported options including:
- Basic: `prompt` (required), `negative_prompt`, `width`, `height`, `steps`, `seed`, `batch_size`, `batch_count`
- Guidance: `guidance_scale`, `aesthetic_score`, `sharpness`
- Models: `sampler`, `model`, `refiner_model`, `refiner_start`
- Advanced: `hires_fix`, `upscaler`, `clip_skip`, `tiled_decoding`, `loras`, `controls`
- Video/Animation: `fps`, `num_frames`, `motion_scale`

**Rate Limit:** 10 requests per minute (configurable)

### GET /api/status

Get the status of one or more image generation jobs.

**Query Parameters:**
- `id` (optional): Comma-separated job IDs or array of job IDs

**Examples:**

```bash
# Single job
GET /api/status?id=abc123

# Multiple jobs (comma-separated)
GET /api/status?id=abc123,def456,ghi789

# Multiple jobs (array)
GET /api/status?id[]=abc123&id[]=def456

# All jobs
GET /api/status
```

**Response:**

```json
{
  "jobs": [
    {
      "id": "abc123",
      "position": 0
    },
    {
      "id": "def456",
      "position": 2
    }
  ]
}
```

Position meanings:
- `0`: Job is currently being processed
- `> 0`: Job position in queue
- `-1`: Job not found

### GET /api/image/:id

Retrieve a generated image with optional format conversion and encoding.

**Path Parameters:**
- `id`: Job ID

**Query Parameters:**
- `format` (optional): Image format - `png` (default), `webp`, `jpg`, `jpeg`
- `response` (optional): Response type - `file` (default), `base64`

**Examples:**

```bash
# Default: PNG file
GET /api/image/abc123

# Convert to WebP
GET /api/image/abc123?format=webp

# Convert to JPEG
GET /api/image/abc123?format=jpeg

# Return as base64-encoded JSON
GET /api/image/abc123?response=base64

# Convert to WebP and return as base64
GET /api/image/abc123?format=webp&response=base64
```

**Response (file):**

Returns the image file with appropriate `Content-Type` header:
- `image/png` for PNG format
- `image/webp` for WebP format
- `image/jpeg` for JPEG format

**Response (base64):**

```json
{
  "id": "abc123",
  "format": "webp",
  "mimeType": "image/webp",
  "data": "base64-encoded-image-data..."
}
```

### GET /api/heartbeat

Check if the DrawThings API is available.

**Response:**

```json
{
  "isAlive": true
}
```

## Rate Limiting

The API implements two-tier rate limiting:

- **General endpoints**: 100 requests per minute (configurable via `RATE_LIMIT_MAX_REQUESTS`)
- **Image generation**: 10 requests per minute (configurable via `RATE_LIMIT_GENERATE_MAX`)

When rate limit is exceeded, the API returns:

```json
{
  "error": "TooManyRequests",
  "message": "Too many requests, please try again later."
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {} // Optional additional error details
}
```

Common error types:
- `Validation failed`: Invalid request parameters
- `NotFound`: Resource not found
- `ServiceUnavailable`: DrawThings API is not available
- `TooManyRequests`: Rate limit exceeded
- `InternalServerError`: Server error

## Image Format Conversion

The `/api/image/:id` endpoint uses [Sharp](https://sharp.pixelplumbing.com/) for high-performance image format conversion:

- **PNG**: Original format (no conversion needed)
- **WebP**: Modern format with excellent compression
- **JPEG**: Universal compatibility with lossy compression

Conversion happens on-the-fly, so there's no need to store multiple versions of the same image.

## Security

- **Input Validation**: All inputs are validated using Zod schemas
- **Path Traversal Protection**: Job IDs are validated to prevent directory traversal attacks
- **Rate Limiting**: Protects against DDoS and API abuse
- **Error Sanitization**: Sensitive error details are not exposed to clients

## Development

### Project Structure

```
src/
├── config/           # Configuration and environment validation
├── controllers/      # Business logic
├── errors/           # Custom error classes
├── middleware/       # Express middleware (validation, error handling, rate limiting)
├── models/           # Data models and schemas
├── routes/           # API route handlers
└── utils/            # Utility functions and logger
```

### Adding New Endpoints

1. Create a route handler in `src/routes/`
2. Define validation schemas in `src/models/schemas.ts`
3. Add middleware for validation and rate limiting
4. Update this README with endpoint documentation

## License

MIT
