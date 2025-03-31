#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
CONFIG_FILE="$PROJECT_ROOT/supabase/config.toml"

# Function to check if a port is in use
is_port_in_use() {
    if command -v lsof &> /dev/null; then
        lsof -i :"$1" &>/dev/null
        return $?
    elif command -v netstat &> /dev/null; then
        netstat -tuln | grep -q :"$1"
        return $?
    else
        # If we can't check, assume it's not in use
        return 1
    fi
}

# Function to kill process using a specific port
kill_process_on_port() {
    local port="$1"
    if command -v lsof &> /dev/null; then
        local pids=$(lsof -ti:"$port" 2>/dev/null)
        if [ -n "$pids" ]; then
            echo "Killing processes using port $port: $pids"
            kill -9 $pids 2>/dev/null || true
            return 0
        fi
    fi
    return 1
}

# Try to stop any running Supabase instances first to avoid port conflicts
echo "Stopping any existing Supabase instances..."
cd "$PROJECT_ROOT" && supabase stop || true

# Wait a moment for ports to be released
sleep 2

# Extract port values from config.toml
DB_PORT=$(grep -A3 "\[db\]" "$CONFIG_FILE" | grep "port" | head -1 | awk -F'=' '{print $2}' | tr -d ' ')
API_PORT=$(grep -A3 "\[api\]" "$CONFIG_FILE" | grep "port" | head -1 | awk -F'=' '{print $2}' | tr -d ' ')
STUDIO_PORT=$(grep -A3 "\[studio\]" "$CONFIG_FILE" | grep "port" | head -1 | awk -F'=' '{print $2}' | tr -d ' ')

echo "Found ports in config: API=$API_PORT, DB=$DB_PORT, Studio=$STUDIO_PORT"

# Kill any processes using these ports
for PORT in $API_PORT $DB_PORT $STUDIO_PORT; do
    if is_port_in_use "$PORT"; then
        echo "Port $PORT is in use. Attempting to kill the process..."
        kill_process_on_port "$PORT"
        sleep 1
    fi
done

# Create a temporary backup of config.toml
cp "$CONFIG_FILE" "$CONFIG_FILE.bak"

# Check if ports are still in use and modify if needed
MODIFIED=false

if is_port_in_use "$DB_PORT"; then
    NEW_DB_PORT=$((DB_PORT + 10))
    echo "Port $DB_PORT is still in use. Temporarily changing DB port to $NEW_DB_PORT"
    sed -i.temp "s/port = $DB_PORT/port = $NEW_DB_PORT/" "$CONFIG_FILE"
    MODIFIED=true
fi

if is_port_in_use "$API_PORT"; then
    NEW_API_PORT=$((API_PORT + 10))
    echo "Port $API_PORT is still in use. Temporarily changing API port to $NEW_API_PORT"
    sed -i.temp "s/port = $API_PORT/port = $NEW_API_PORT/" "$CONFIG_FILE"
    MODIFIED=true
fi

if is_port_in_use "$STUDIO_PORT"; then
    NEW_STUDIO_PORT=$((STUDIO_PORT + 10))
    echo "Port $STUDIO_PORT is still in use. Temporarily changing Studio port to $NEW_STUDIO_PORT"
    sed -i.temp "s/port = $STUDIO_PORT/port = $NEW_STUDIO_PORT/" "$CONFIG_FILE"
    MODIFIED=true
fi

# Remove temporary files created by sed
rm -f "$CONFIG_FILE.temp" 2>/dev/null

if [ "$MODIFIED" = true ]; then
    echo "Temporarily modified ports in config.toml to avoid conflicts"

    # Create/update a .env file with the updated ports for tests
    echo "Updating .env file with new ports for tests..."
    ENV_FILE="$SCRIPT_DIR/.env"
    if [ -f "$ENV_FILE" ]; then
        # Backup the current .env file
        cp "$ENV_FILE" "$ENV_FILE.bak"
    fi

    # Set the new URL with the updated API port if needed
    if [ -n "$NEW_API_PORT" ]; then
        echo "SUPABASE_URL=http://localhost:$NEW_API_PORT" > "$ENV_FILE"
    else
        echo "SUPABASE_URL=http://localhost:$API_PORT" > "$ENV_FILE"
    fi
    
    # Add default keys
    echo "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" >> "$ENV_FILE"
    echo "SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" >> "$ENV_FILE"
    echo "ENVIRONMENT=test" >> "$ENV_FILE"
    
    echo "Created/updated .env file with new ports"
fi

echo "Starting local Supabase server..."
cd "$PROJECT_ROOT" && supabase start

START_RESULT=$?

# If start was successful, run tests
if [ $START_RESULT -eq 0 ]; then
    echo "Supabase started successfully."
    echo "Running tests..."
    cd "$SCRIPT_DIR" && python -m pytest tests/
    TEST_EXIT_CODE=$?
    
    echo "Stopping Supabase server..."
    cd "$PROJECT_ROOT" && supabase stop
    
    # Restore original config if it was modified
    if [ "$MODIFIED" = true ]; then
        mv "$CONFIG_FILE.bak" "$CONFIG_FILE"
        echo "Restored original config.toml"
        
        # Restore original .env if it existed
        if [ -f "$ENV_FILE.bak" ]; then
            mv "$ENV_FILE.bak" "$ENV_FILE"
        fi
    else
        rm -f "$CONFIG_FILE.bak" 2>/dev/null
    fi
    
    exit $TEST_EXIT_CODE
else
    # Restore original config if it was modified
    if [ "$MODIFIED" = true ]; then
        mv "$CONFIG_FILE.bak" "$CONFIG_FILE"
        echo "Restored original config.toml"
        
        # Restore original .env if it existed
        if [ -f "$ENV_FILE.bak" ]; then
            mv "$ENV_FILE.bak" "$ENV_FILE"
        fi
    else
        rm -f "$CONFIG_FILE.bak" 2>/dev/null
    fi
    
    echo "Failed to start Supabase server."
    
    echo ""
    echo "If you're seeing a port conflict error:"
    echo "1. Try manually stopping all Supabase instances: supabase stop"
    echo "2. Check if there are any orphaned Docker containers with: docker ps"
    echo "3. Stop any containers using conflicting ports: docker stop <container_id>"
    echo "4. Kill processes using the conflicting ports:"
    echo "   - For port $API_PORT: lsof -ti:$API_PORT | xargs kill -9"
    echo "   - For port $DB_PORT: lsof -ti:$DB_PORT | xargs kill -9"
    echo "   - For port $STUDIO_PORT: lsof -ti:$STUDIO_PORT | xargs kill -9"
    exit 1
fi 