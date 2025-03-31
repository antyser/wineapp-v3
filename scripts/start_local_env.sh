#!/bin/bash
# Script to start the local development environment

# Make sure we're in the project root
cd "$(dirname "$0")/.." || exit 1

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start Supabase with Docker Compose
echo "Starting Supabase with Docker Compose..."
docker-compose up -d

# Wait for Supabase to be ready
echo "Waiting for Supabase to be ready..."
sleep 5

# Run migrations
echo "Running database migrations..."
docker exec -i "$(docker-compose ps -q supabase)" psql -U postgres -d postgres -f /migrations/00000000000000_schema.sql

echo "Local development environment is ready!"
echo "Supabase is available at: http://localhost:8000"
echo "You can now start the backend with: cd backend && make run" 