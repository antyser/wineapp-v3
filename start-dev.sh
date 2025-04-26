#!/bin/bash

# Development startup script for the Wine App

echo "Starting Wine App development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker and try again."
  exit 1
fi

# Start or restart Supabase first
echo "Starting Supabase..."
cd supabase
npx supabase start
cd ..

# Wait a moment for Supabase to initialize
echo "Waiting for Supabase to initialize..."
sleep 5

# Create test user
echo "Ensuring test user exists..."
cd supabase
psql "postgres://postgres:postgres@127.0.0.1:54322/postgres" -f test_user.sql
cd ..

# Start the services with docker-compose
echo "Starting backend and frontend services with docker-compose..."
docker-compose -f docker-compose.dev.yml up --build -d

echo ""
echo "🚀 Environment '${ENVIRONMENT}' is starting up!"

# Dynamically determine project name prefix
PROJECT_NAME="wineapp-${ENVIRONMENT}"

if [ "$ENVIRONMENT" == "dev" ]; then
  echo "🔗 Supabase Studio (Local): http://localhost:54323"
  echo "🔗 Backend API (Local): http://localhost:8000"
  echo "🔗 Frontend (Local): http://localhost:19006 (or 8081 for Metro)"
  echo ""
  # Use dynamic project name for logs
  echo "📝 Use 'docker logs -f ${PROJECT_NAME}-backend-1' and 'docker logs -f ${PROJECT_NAME}-frontend-1' for logs."
  echo "⚠️  To stop this 'dev' environment, run: ./stop-dev.sh dev"

elif [ "$ENVIRONMENT" == "prod" ]; then
  echo "🔗 Backend API (Local, connected to Prod DB): http://localhost:8000"
  echo "🔗 Frontend (Local, using backend above): http://localhost:19006"
  echo ""
  echo "🔴 WARNING: Backend is connected to the PRODUCTION Supabase database!"
  # Use dynamic project name for logs
  echo "📝 Use 'docker logs -f ${PROJECT_NAME}-backend-1' and 'docker logs -f ${PROJECT_NAME}-frontend-1' for logs."
  echo "⚠️  To stop this 'prod' testing environment, run: ./stop-dev.sh prod"
fi

echo "" 