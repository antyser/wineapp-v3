#!/bin/bash

# Stop backend and frontend containers
echo "Stopping backend and frontend services..."
docker compose -f docker-compose.app.yml down

# Stop Supabase if it's running
echo "Stopping Supabase..."
supabase stop

echo "Development environment stopped." 