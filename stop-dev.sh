#!/bin/bash

# Stop backend and frontend containers
echo "Stopping backend and frontend services..."
docker compose -f docker-compose.dev.yml down

echo "Development environment stopped."