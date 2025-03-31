#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set up environment for testing
echo "Setting up environment for testing with remote Supabase..."

# Create/update a .env file with remote Supabase details
ENV_FILE="$SCRIPT_DIR/.env"

# Create new .env file or backup existing one
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_FILE.bak"
    echo "Backed up existing .env to .env.bak"
fi

# If SUPABASE_URL and SUPABASE_ANON_KEY are provided as arguments, use them
# Otherwise, prompt for them or use defaults
if [ $# -ge 2 ]; then
    SUPABASE_URL="$1"
    SUPABASE_ANON_KEY="$2"
    if [ $# -ge 3 ]; then
        SUPABASE_SERVICE_KEY="$3"
    else
        # Default service key (this is just a placeholder and won't work with a real project)
        SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
    fi
else
    # Default values - these won't work with real projects
    SUPABASE_URL="https://your-project-ref.supabase.co"
    SUPABASE_ANON_KEY="your-anon-key"
    SUPABASE_SERVICE_KEY="your-service-key"
    
    echo "No Supabase credentials provided."
    echo "Please provide your Supabase URL and keys as arguments:"
    echo "  ./run_tests_no_docker.sh <SUPABASE_URL> <SUPABASE_ANON_KEY> [SUPABASE_SERVICE_KEY]"
    echo ""
    echo "Using defaults for now, but tests will likely fail."
fi

# Write to .env file
cat > "$ENV_FILE" << EOF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
ENVIRONMENT=test
EOF

echo "Created/updated .env file with Supabase settings"
echo "Using Supabase URL: $SUPABASE_URL"

# Run the tests
echo "Running tests..."
python -m pytest tests/

TEST_EXIT_CODE=$?

# Restore original .env if it existed
if [ -f "$ENV_FILE.bak" ]; then
    echo "Restoring original .env file..."
    mv "$ENV_FILE.bak" "$ENV_FILE"
fi

exit $TEST_EXIT_CODE 