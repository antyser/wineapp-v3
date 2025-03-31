#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

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
    echo "Failed to start Supabase server. Make sure Docker is running and try again."
    exit 1
fi 