#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Check if OrbStack is running
if [ -S "$HOME/.orbstack/run/docker.sock" ]; then
    echo "OrbStack socket detected. Checking if OrbStack is running..."
    if ! orbctl status &>/dev/null; then
        echo "OrbStack is installed but not running. Starting OrbStack..."
        open -a OrbStack
        # Wait a moment for OrbStack to initialize
        sleep 5
    fi
    echo "OrbStack is running."
else
    echo "Using standard Docker..."
fi

echo "Starting local Supabase server..."
cd "$PROJECT_ROOT" && supabase start

if [ $? -eq 0 ]; then
    echo "Supabase started successfully."
    echo "Running tests..."
    cd "$SCRIPT_DIR" && python -m pytest tests/
    TEST_EXIT_CODE=$?
    
    echo "Stopping Supabase server..."
    cd "$PROJECT_ROOT" && supabase stop
    
    exit $TEST_EXIT_CODE
else
    echo "Failed to start Supabase server."
    echo "If you're using OrbStack, make sure it's running and try again."
    echo "Run 'open -a OrbStack' to start OrbStack."
    exit 1
fi 