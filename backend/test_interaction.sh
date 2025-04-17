#!/bin/bash

echo "Rebuilding the backend container with Dockerfile.dev..."
cd "$(dirname "$0")/.."
docker compose -f docker-compose.app.yml up -d --build backend

echo "Waiting for backend to start..."
sleep 5

echo "Testing interaction API..."

# Test wine ID (from seed.sql)
TEST_WINE_ID="11111111-1111-1111-1111-111111111111"

# Login to Supabase to get a token
echo "Logging in to get an authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:54321/auth/v1/token?grant_type=password" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')

# Extract the access token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Failed to get access token. Login response:"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "Successfully obtained access token"

# Set auth header for subsequent requests
AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"

# 1. Get current interaction
echo -e "\n1. Getting current interaction for wine $TEST_WINE_ID..."
curl -s -X GET "http://localhost:8000/api/v1/interactions/wine/$TEST_WINE_ID" \
  -H "$AUTH_HEADER" | jq .

# 2. Toggle liked status
echo -e "\n2. Toggling 'liked' status..."
curl -s -X POST "http://localhost:8000/api/v1/interactions/wine/$TEST_WINE_ID/toggle/liked" \
  -H "$AUTH_HEADER" | jq .

# 3. Set rating
echo -e "\n3. Setting rating to 4.5..."
curl -s -X POST "http://localhost:8000/api/v1/interactions/wine/$TEST_WINE_ID/rate?rating=4.5" \
  -H "$AUTH_HEADER" | jq .

# 4. Toggle wishlist status
echo -e "\n4. Toggling 'wishlist' status..."
curl -s -X POST "http://localhost:8000/api/v1/interactions/wine/$TEST_WINE_ID/toggle/wishlist" \
  -H "$AUTH_HEADER" | jq .

echo -e "\nTest completed!" 