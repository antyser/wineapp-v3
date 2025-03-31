#!/bin/bash
set -e  # Exit on error

# Script to run the development server with the development database
# This will:
# 1. Check if Supabase is running and start it if necessary
# 2. Make sure the development database is set up
# 3. Run the backend server in development mode

# Print colored output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Development database name (default postgres database)
DEV_DB_NAME="postgres"

# Display help message
function show_help {
  echo "Usage: $0 [OPTION]"
  echo "Run the backend development server with the development database."
  echo ""
  echo "Options:"
  echo "  --reset    Reset the development database before starting the server"
  echo "  --help     Display this help message and exit"
  echo ""
  echo "Examples:"
  echo "  $0                # Run the development server"
  echo "  $0 --reset        # Reset the database and run the server"
  exit 0
}

# Process command line arguments
if [ "$1" == "--help" ]; then
  show_help
fi

# Determine if we're in the backend directory or project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
if [[ "$SCRIPT_DIR" == */backend/scripts ]]; then
  # We're running from backend/scripts, so go up to project root
  cd "$SCRIPT_DIR/../.."
elif [[ "$SCRIPT_DIR" == */scripts ]]; then
  # We're running from scripts directly, go up one level then to project root
  cd "$SCRIPT_DIR/../.."
else
  # Assume we're already in the project root or backend directory
  if [[ -d "backend" && ! -d "scripts" ]]; then
    # We're in the project root
    :
  elif [[ -d "scripts" && -f "run.py" ]]; then
    # We're in the backend directory, go up one level
    cd ..
  else
    echo -e "${RED}Error: Cannot determine project structure. Please run this script from the project root or backend directory.${NC}"
    exit 1
  fi
fi

# Now we should be in the project root
ROOT_DIR=$(pwd)
echo -e "${YELLOW}Running from project root: $ROOT_DIR${NC}"

echo -e "${YELLOW}=== Checking Supabase Status ===${NC}"
SUPABASE_STATUS=$(npx supabase status 2>&1)
if [[ $SUPABASE_STATUS == *"Server is not running"* ]] || [[ $SUPABASE_STATUS == *"Could not connect to"* ]]; then
  echo -e "${YELLOW}Supabase is not running. Starting it now...${NC}"
  npx supabase start
elif [[ $SUPABASE_STATUS == *"supabase local development setup is running"* ]]; then
  echo -e "${GREEN}Supabase is already running.${NC}"
else
  echo -e "${RED}Unexpected Supabase status. Make sure Supabase is properly installed and running.${NC}"
  echo "$SUPABASE_STATUS"
  exit 1
fi

# Check if we need to reset the database
if [ "$1" == "--reset" ]; then
  echo -e "\n${YELLOW}=== Resetting Development Database ===${NC}"
  npx supabase db reset
fi

echo -e "\n${YELLOW}=== Running Development Server ===${NC}"
# Change to the backend directory
cd "$ROOT_DIR/backend"

# Set environment variables
export ENVIRONMENT="development"
export SUPABASE_URL="http://127.0.0.1:54321"

# Run the server
echo -e "${GREEN}Starting development server...${NC}"
echo -e "${YELLOW}The server will be available at http://localhost:8000${NC}"
echo -e "${YELLOW}API docs will be available at http://localhost:8000/docs${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"

python run.py 