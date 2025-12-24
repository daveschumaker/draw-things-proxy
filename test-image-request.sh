#!/bin/bash

# Test script for DrawThings Proxy API
# This script demonstrates the full workflow of generating an image

API_URL="http://localhost:3001/api"
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
RESET="\033[0m"

echo -e "${BOLD}DrawThings Proxy API Test${RESET}\n"

# Step 1: Check if DrawThings is alive
echo -e "${BLUE}Step 1: Checking DrawThings API status...${RESET}"
HEARTBEAT=$(curl -s "${API_URL}/heartbeat")
echo "$HEARTBEAT" | jq .
IS_ALIVE=$(echo "$HEARTBEAT" | jq -r '.data.isAlive')

if [ "$IS_ALIVE" != "true" ]; then
  echo "❌ DrawThings API is not running. Please start DrawThings first."
  exit 1
fi
echo -e "${GREEN}✓ DrawThings API is running${RESET}\n"

# Step 2: Submit image generation request
echo -e "${BLUE}Step 2: Submitting image generation request...${RESET}"
RESPONSE=$(curl -s -X POST "${API_URL}/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a beautiful sunset over mountains, vibrant colors, professional photography",
    "negative_prompt": "blurry, low quality, distorted",
    "width": 512,
    "height": 512,
    "steps": 20,
    "guidance_scale": 7.5,
    "seed": -1,
    "batch_size": 1
  }')

echo "$RESPONSE" | jq .

JOB_ID=$(echo "$RESPONSE" | jq -r '.data.jobId')
POSITION=$(echo "$RESPONSE" | jq -r '.data.position')

if [ -z "$JOB_ID" ] || [ "$JOB_ID" == "null" ]; then
  echo "❌ Failed to submit job"
  exit 1
fi

echo -e "${GREEN}✓ Job submitted: ${JOB_ID}${RESET}"
echo -e "  Queue position: ${POSITION}\n"

# Step 3: Check job status
echo -e "${BLUE}Step 3: Checking job status...${RESET}"
STATUS=$(curl -s "${API_URL}/status?id=${JOB_ID}")
echo "$STATUS" | jq .

QUEUE_POSITION=$(echo "$STATUS" | jq -r ".data.jobs[0].position")
echo -e "${GREEN}✓ Current position: ${QUEUE_POSITION}${RESET}\n"

# Step 4: Wait for job to complete
echo -e "${BLUE}Step 4: Waiting for image generation to complete...${RESET}"
echo "  (This may take a minute depending on your settings)"

while true; do
  sleep 2
  STATUS=$(curl -s "${API_URL}/status?id=${JOB_ID}")
  QUEUE_POSITION=$(echo "$STATUS" | jq -r ".data.jobs[0].position")

  if [ "$QUEUE_POSITION" == "-1" ]; then
    echo "  ⏳ Job not found (may be completed)"
    break
  elif [ "$QUEUE_POSITION" == "0" ]; then
    echo "  ⏳ Processing... (position: 0)"
  else
    echo "  ⏳ Waiting... (position: ${QUEUE_POSITION})"
  fi
done

# Give it a moment for file to be saved
sleep 2

echo -e "${GREEN}✓ Generation complete${RESET}\n"

# Step 5: Retrieve the image in different formats
echo -e "${BLUE}Step 5: Retrieving generated image...${RESET}\n"

# Test 1: Get original PNG
echo "  📸 Downloading original PNG..."
curl -s "${API_URL}/image/${JOB_ID}" \
  -o "/tmp/test-image.png"
if [ -f "/tmp/test-image.png" ]; then
  SIZE=$(ls -lh /tmp/test-image.png | awk '{print $5}')
  echo -e "  ${GREEN}✓ PNG saved to /tmp/test-image.png (${SIZE})${RESET}"
fi

# Test 2: Convert to WebP
echo "  📸 Converting to WebP..."
curl -s "${API_URL}/image/${JOB_ID}?format=webp" \
  -o "/tmp/test-image.webp"
if [ -f "/tmp/test-image.webp" ]; then
  SIZE=$(ls -lh /tmp/test-image.webp | awk '{print $5}')
  echo -e "  ${GREEN}✓ WebP saved to /tmp/test-image.webp (${SIZE})${RESET}"
fi

# Test 3: Convert to JPEG
echo "  📸 Converting to JPEG..."
curl -s "${API_URL}/image/${JOB_ID}?format=jpeg" \
  -o "/tmp/test-image.jpg"
if [ -f "/tmp/test-image.jpg" ]; then
  SIZE=$(ls -lh /tmp/test-image.jpg | awk '{print $5}')
  echo -e "  ${GREEN}✓ JPEG saved to /tmp/test-image.jpg (${SIZE})${RESET}"
fi

# Test 4: Get as base64 JSON
echo "  📸 Getting as base64 JSON..."
BASE64_RESPONSE=$(curl -s "${API_URL}/image/${JOB_ID}?response=base64")
DATA_LENGTH=$(echo "$BASE64_RESPONSE" | jq -r '.data.data' | wc -c)
echo -e "  ${GREEN}✓ Base64 response received (${DATA_LENGTH} chars)${RESET}"
echo "  Sample response:"
echo "$BASE64_RESPONSE" | jq '{id, format, mimeType, data: (.data.data[:100] + "...")}'

echo -e "\n${BOLD}${GREEN}🎉 All tests completed!${RESET}"
echo -e "\nGenerated files:"
echo "  • /tmp/test-image.png"
echo "  • /tmp/test-image.webp"
echo "  • /tmp/test-image.jpg"
echo -e "\nYou can open them with:"
echo "  open /tmp/test-image.png"
