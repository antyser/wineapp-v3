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
docker-compose -f docker-compose.app.yml up --build -d

echo ""
echo "🚀 Development environment is ready!"
echo "🔗 Supabase Studio: http://localhost:54323"
echo "🔗 Backend API: http://localhost:8000"
echo "🔗 Frontend: http://localhost:19006"
echo ""
echo "📝 Use the following commands to access logs:"
echo "   Backend: docker logs -f wineapp-backend-1"
echo "   Frontend: docker logs -f wineapp-frontend-1"
echo ""
echo "⚠️  To stop the development environment:"
echo "   • Run 'docker-compose -f docker-compose.app.yml down' to stop the app services"
echo "   • Run 'npx supabase stop' to stop Supabase" 