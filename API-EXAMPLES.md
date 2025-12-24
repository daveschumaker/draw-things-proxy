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
