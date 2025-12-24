# DrawThings Proxy API - Curl Examples

## 1. Check if DrawThings is Running

```bash
curl http://localhost:3001/api/heartbeat | jq .
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isAlive": true
  }
}
```

## 2. Generate an Image

### Basic Request (Minimal Parameters)

```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a beautiful sunset over mountains, vibrant colors, professional photography"
  }' | jq .
```

**Note:** Only `prompt` is required. All other parameters are optional and will use DrawThings' defaults.

### Request with Common Parameters

```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a beautiful sunset over mountains, vibrant colors, professional photography",
    "negative_prompt": "blurry, low quality, distorted",
    "width": 512,
    "height": 512,
    "steps": 20,
    "guidance_scale": 7.5,
    "seed": -1
  }' | jq .
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "abc123def456",
    "position": 0
  },
  "message": "Job added to queue"
}
```

### Important: Parameter Defaults

The proxy **does not set defaults** for most parameters. Instead:

- **Omitted parameters** → DrawThings uses its own defaults
- **`seed` parameter**:
  - Not provided or `-1` → Proxy generates random seed (1-4294967295)
  - Specific value → Passed through to DrawThings
- **All other parameters** → Passed directly to DrawThings as-is

This "pass-through" design ensures:
- DrawThings controls its own defaults
- No proxy updates needed when DrawThings changes
- Maximum flexibility for advanced users

### Advanced Request (All Common Parameters)

```bash
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a serene mountain landscape",
    "negative_prompt": "blurry, low quality",
    "width": 1024,
    "height": 1024,
    "steps": 30,
    "guidance_scale": 7.5,
    "sampler": "dpm++_2m_karras",
    "model": "sd_xl_base_1.0.safetensors",
    "refiner_model": "sd_xl_refiner_1.0.safetensors",
    "refiner_start": 0.8,
    "clip_skip": 2,
    "hires_fix": true,
    "hires_fix_width": 1536,
    "hires_fix_height": 1536,
    "hires_fix_strength": 0.5
  }' | jq .
```

## 3. Check Job Status

```bash
# Single job
curl 'http://localhost:3001/api/status?id=abc123def456' | jq .

# Multiple jobs
curl 'http://localhost:3001/api/status?id=abc123,def456,ghi789' | jq .

# All jobs
curl http://localhost:3001/api/status | jq .
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "jobId": "abc123def456",
      "position": -1,
      "status": "completed",
      "createdAt": 1766562503276,
      "completedAt": 1766562543785
    }
  ]
}
```

**Position meanings:**
- `0`: Currently processing
- `> 0`: Position in queue
- `-1`: Completed or not found

## 4. Retrieve Generated Image

### Get original PNG
```bash
curl 'http://localhost:3001/api/image/abc123def456' \
  -o image.png
```

### Convert to WebP
```bash
curl 'http://localhost:3001/api/image/abc123def456?format=webp' \
  -o image.webp
```

### Convert to JPEG
```bash
curl 'http://localhost:3001/api/image/abc123def456?format=jpeg' \
  -o image.jpg
```

### Get as Base64 JSON
```bash
curl 'http://localhost:3001/api/image/abc123def456?response=base64' | jq .
```

**Response:**
```json
{
  "id": "abc123def456",
  "format": "png",
  "mimeType": "image/png",
  "data": "iVBORw0KGgoAAAANSUhEUg..."
}
```

### Convert to WebP AND get as Base64
```bash
curl 'http://localhost:3001/api/image/abc123def456?format=webp&response=base64' | jq .
```

**Response:**
```json
{
  "id": "abc123def456",
  "format": "webp",
  "mimeType": "image/webp",
  "data": "UklGRiQAAABXRUJQVlA4..."
}
```

## 5. Complete Workflow Example

```bash
# 1. Check DrawThings is running
curl http://localhost:3001/api/heartbeat | jq .

# 2. Submit job
JOB_RESPONSE=$(curl -s -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a serene lake at sunset",
    "width": 512,
    "height": 512,
    "steps": 20
  }')

# 3. Extract job ID
JOB_ID=$(echo $JOB_RESPONSE | jq -r '.data.jobId')
echo "Job ID: $JOB_ID"

# 4. Poll for completion
while true; do
  STATUS=$(curl -s "http://localhost:3001/api/status?id=$JOB_ID")
  POSITION=$(echo $STATUS | jq -r '.data[0].position')

  if [ "$POSITION" == "-1" ]; then
    echo "Generation complete!"
    break
  else
    echo "Position in queue: $POSITION"
    sleep 2
  fi
done

# 5. Download image
curl "http://localhost:3001/api/image/$JOB_ID" -o generated.png
echo "Image saved to generated.png"
```

## Test Results from Live Run

Using the API, we successfully generated and retrieved an image in multiple formats:

- **PNG** (original): 302KB
- **WebP** (compressed): 11KB (96% size reduction!)
- **JPEG**: 21KB (93% size reduction)
- **Base64 JSON**: 411,724 characters

The format conversion feature provides excellent compression, especially WebP which reduced the file size from 302KB to just 11KB while maintaining visual quality.

## 6. Complete Parameter Reference

### Basic Parameters

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `prompt` | string | 1-2000 chars | **Required**. Text description of desired image |
| `negative_prompt` | string | 0-2000 chars | What to avoid in the image |
| `width` | integer | 64-2048 | Image width in pixels |
| `height` | integer | 64-2048 | Image height in pixels |
| `steps` | integer | 1-150 | Number of diffusion steps (more = higher quality, slower) |
| `seed` | integer | -1 to 4294967295 | Random seed (-1 = random, proxy auto-generates) |
| `batch_size` | integer | 1-8 | Number of images per batch |
| `batch_count` | integer | 1-100 | Number of batches to generate |

### Guidance & Quality

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `guidance_scale` | number | 0-30 | How closely to follow prompt (typical: 7-8) |
| `guidance_embed` | number | - | Guidance embedding value |
| `image_guidance` | number | - | Image-to-image guidance strength |
| `aesthetic_score` | number | - | Target aesthetic quality score |
| `negative_aesthetic_score` | number | - | Negative aesthetic score |
| `sharpness` | number | - | Image sharpness adjustment |

### Model & Sampler

| Parameter | Type | Max Length | Description |
|-----------|------|------------|-------------|
| `sampler` | string | 50 chars | Sampling method (e.g., "euler", "dpm++_2m_karras") |
| `model` | string | 100 chars | Model filename (e.g., "sd_xl_base_1.0.safetensors") |
| `refiner_model` | string | 100 chars | SDXL refiner model |
| `refiner_start` | number | 0-1 | When to switch to refiner (e.g., 0.8) |

### CLIP & Text Encoders

| Parameter | Type | Description |
|-----------|------|-------------|
| `clip_skip` | integer (0-12) | Skip last N CLIP layers |
| `clip_weight` | number | CLIP weight adjustment |
| `clip_l_text` | string/null | Separate CLIP-L prompt |
| `open_clip_g_text` | string/null | Separate OpenCLIP-G prompt |
| `separate_clip_l` | boolean | Use separate CLIP-L encoder |
| `separate_open_clip_g` | boolean | Use separate OpenCLIP-G encoder |
| `t5_text_encoder_decoding` | boolean | Use T5 text encoder |

### High-Resolution Fix

| Parameter | Type | Description |
|-----------|------|-------------|
| `hires_fix` | boolean | Enable high-res fix for upscaling |
| `hires_fix_width` | integer | Target width for hires fix |
| `hires_fix_height` | integer | Target height for hires fix |
| `hires_fix_strength` | number (0-1) | Denoising strength for hires fix |

### Upscaler

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `upscaler` | string/null | 50 chars | Upscaler model name |
| `upscaler_scale` | number | 1-4 | Upscale factor |

### Img2Img / Inpainting

| Parameter | Type | Description |
|-----------|------|-------------|
| `strength` | number (0-1) | Denoising strength for img2img |
| `mask_blur` | number | Blur mask edges |
| `mask_blur_outset` | number | Extend mask outward |
| `preserve_original_after_inpaint` | boolean | Keep original unmasked areas |

### Advanced Dimensions (SDXL)

| Parameter | Type | Description |
|-----------|------|-------------|
| `original_width` | integer | Original image width for conditioning |
| `original_height` | integer | Original image height for conditioning |
| `target_width` | integer | Target width for conditioning |
| `target_height` | integer | Target height for conditioning |
| `crop_left` | integer | Crop offset from left |
| `crop_top` | integer | Crop offset from top |
| `negative_original_width` | integer | Negative conditioning width |
| `negative_original_height` | integer | Negative conditioning height |

### Tiled Generation (Large Images)

| Parameter | Type | Description |
|-----------|------|-------------|
| `tiled_decoding` | boolean | Enable tiled VAE decoding |
| `tiled_diffusion` | boolean | Enable tiled diffusion |
| `decoding_tile_width` | integer | Tile width for decoding |
| `decoding_tile_height` | integer | Tile height for decoding |
| `decoding_tile_overlap` | integer | Overlap between decoding tiles |
| `diffusion_tile_width` | integer | Tile width for diffusion |
| `diffusion_tile_height` | integer | Tile height for diffusion |
| `diffusion_tile_overlap` | integer | Overlap between diffusion tiles |

### Video/Animation

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `fps` | integer | 1-60 | Frames per second |
| `num_frames` | integer | ≥1 | Number of frames to generate |
| `motion_scale` | number | - | Motion intensity |
| `guiding_frame_noise` | number | - | Noise level for guiding frames |
| `start_frame_guidance` | number | - | Guidance for start frame |
| `stage_2_guidance` | number | - | Second stage guidance |

### Advanced Sampling

| Parameter | Type | Description |
|-----------|------|-------------|
| `seed_mode` | string | Seed mode configuration |
| `stochastic_sampling_gamma` | number | Stochastic sampling parameter |
| `shift` | number | Noise schedule shift |
| `stage_2_shift` | number | Second stage shift |

### Image Prior

| Parameter | Type | Description |
|-----------|------|-------------|
| `image_prior_steps` | integer | Steps for image prior models |
| `negative_prompt_for_image_prior` | boolean | Use negative prompt for prior |

### Performance & Optimization

| Parameter | Type | Description |
|-----------|------|-------------|
| `speed_up_with_guidance_embed` | boolean | Optimize with guidance embed |
| `zero_negative_prompt` | boolean | Zero out negative prompt |

### LoRAs & ControlNet

| Parameter | Type | Description |
|-----------|------|-------------|
| `loras` | array | LoRA configurations (see DrawThings docs) |
| `controls` | array | ControlNet configurations (see DrawThings docs) |

---

**Note:** See [schemas.ts](../src/models/schemas.ts) for the complete parameter validation rules.
