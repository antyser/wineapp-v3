#!/bin/bash

# Exit on error
set -e

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI not found. Please install it first."
    echo "  npm install -g supabase"
    echo "  or"
    echo "  brew install supabase/tap/supabase"
    exit 1
fi

# Function to check if Supabase is running
check_supabase_running() {
    # Try to access the Supabase health endpoint
    if curl -s "http://localhost:54321/rest/v1/" > /dev/null 2>&1; then
        return 0 # Supabase is running
    else
        return 1 # Supabase is not running
    fi
}

# Start Supabase if it's not already running
if ! check_supabase_running; then
    echo "Starting Supabase..."
    
    # Check if supabase directory exists
    if [ ! -d "./supabase" ]; then
        echo "Initializing Supabase project..."
        supabase init
    fi
    
    # Start Supabase in the background
    supabase start
    
    # Wait for Supabase to be ready
    echo "Waiting for Supabase to be ready..."
    MAX_ATTEMPTS=30
    ATTEMPT=0
    
    while ! check_supabase_running && [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        ATTEMPT=$((ATTEMPT+1))
        echo "Waiting for Supabase to start... attempt $ATTEMPT/$MAX_ATTEMPTS"
        sleep 5
    done
    
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo "Error: Supabase did not start properly after $MAX_ATTEMPTS attempts."
        exit 1
    fi
    
    echo "✅ Supabase is up and running!"
else
    echo "✅ Supabase is already running."
fi

# Check for migrations and apply them more safely
echo "Checking for migrations..."
if [ -d "./supabase/migrations" ] && [ "$(ls -A ./supabase/migrations)" ]; then
    echo "Running migrations..."
    
    # Check if seed file exists and if it has the problematic column reference
    SEED_FILE="./supabase/seed.sql"
    if [ -f "$SEED_FILE" ]; then
        echo "Checking seed file for compatibility issues..."
        if grep -q "is_confirmed" "$SEED_FILE"; then
            echo "Warning: Found reference to 'is_confirmed' column in seed file."
            echo "Creating backup of original seed file..."
            cp "$SEED_FILE" "${SEED_FILE}.bak"
            
            echo "Temporarily modifying seed file to remove problematic data..."
            # Comment out any lines with is_confirmed to prevent errors
            sed -i.tmp '/is_confirmed/s/^/-- /' "$SEED_FILE"
            echo "Seed file temporarily modified."
        fi
    fi
    
    # Apply migrations but not seed
    echo "Applying only migrations (skipping seed)..."
    supabase db reset --no-seed || {
        echo "Migration failed, but we'll continue with setup."
    }
    
    # Restore original seed file if we modified it
    if [ -f "${SEED_FILE}.tmp" ]; then
        echo "Restoring original seed file..."
        mv "${SEED_FILE}.bak" "$SEED_FILE"
        rm -f "${SEED_FILE}.tmp"
    fi
else
    echo "No migrations found. Skipping."
fi

# Start backend and frontend
echo "Starting backend and frontend services..."

# First, make sure the backend has all required dependencies
echo "Checking backend dependencies..."
if [ -d "./backend" ]; then
    DOCKERFILE_PATH="./backend/Dockerfile"
    # Check if the Dockerfile is properly configured for uv sync
    if ! grep -q "uv sync" "$DOCKERFILE_PATH" 2>/dev/null; then
        echo "⚠️  Updating Dockerfile to use uv sync for dependency management"
        # Add the dependency to the Dockerfile
        sed -i.bak 's/RUN uv pip install --system -r requirements.txt/RUN --mount=type=cache,target=\/root\/.cache\/uv \\\n    uv sync --frozen/' "$DOCKERFILE_PATH"
        echo "✅ Updated Dockerfile to use uv sync."
    fi
    
    # Make sure UV_SYSTEM_PYTHON is set
    if ! grep -q "UV_SYSTEM_PYTHON" "$DOCKERFILE_PATH" 2>/dev/null; then
        echo "⚠️  Adding UV_SYSTEM_PYTHON environment variable to Dockerfile"
        sed -i.bak '/ENV PYTHONPATH/s/$/ \\\n    UV_SYSTEM_PYTHON=1/' "$DOCKERFILE_PATH"
        echo "✅ Added UV_SYSTEM_PYTHON environment variable."
    fi
fi

# Start the docker services
docker compose -f docker-compose.app.yml up --build -d

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
echo "   • Run 'docker compose -f docker-compose.app.yml down' to stop the app services"
echo "   • Run 'supabase stop' to stop Supabase" 