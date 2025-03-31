#!/bin/bash

# Script to run the backend tests without using Docker
# Can be used with a remote Supabase URL by setting the SUPABASE_URL environment variable

# Set environment to dev (we use dev for testing)
export ENVIRONMENT="development"

# Change to the backend directory
cd "$(dirname "$0")/.."

echo "Running tests in $ENVIRONMENT environment with Supabase URL from .env.dev"

# Run the tests
python -m pytest tests/ -v

# Return the test exit code
exit $? 