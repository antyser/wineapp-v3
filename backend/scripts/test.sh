#!/bin/bash
set -e  # Exit on error

# Script to run the backend tests with a test database
# This will:
# 1. Check if Supabase is running and start it if necessary
# 2. Create and reset a test database
# 3. Set appropriate environment variables for testing
# 4. Run tests and report success or failure

# Print colored output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set the test database name and password
TEST_DB_NAME="wineapp_test"
PG_PASSWORD="postgres"  # Hardcoded default Supabase local password

# Display help message
function show_help {
  echo "Usage: $0 [TEST_PATH]"
  echo "Run the backend tests with a dedicated test database."
  echo ""
  echo "Arguments:"
  echo "  TEST_PATH    Optional path to a specific test file or test function"
  echo ""
  echo "Options:"
  echo "  --help       Display this help message and exit"
  echo ""
  echo "Examples:"
  echo "  $0                                    # Run all tests"
  echo "  $0 tests/wines/test_service.py        # Run tests in a specific file"
  echo "  $0 tests/wines/test_service.py::test_get_wines  # Run a specific test"
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

echo -e "\n${YELLOW}=== Setting Up Test Database ===${NC}"
# Create test database if it doesn't exist
PSQL_COMMAND="PGPASSWORD=$PG_PASSWORD psql -h 127.0.0.1 -p 54322 -U postgres -d postgres"
DB_EXISTS=$(eval "$PSQL_COMMAND -t -c \"SELECT 1 FROM pg_database WHERE datname = '$TEST_DB_NAME'\"" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$DB_EXISTS" != "1" ]; then
  echo -e "${YELLOW}Creating test database: $TEST_DB_NAME${NC}"
  eval "$PSQL_COMMAND -c \"CREATE DATABASE $TEST_DB_NAME\"" 2>/dev/null
  echo -e "${GREEN}Test database created successfully.${NC}"
else
  echo -e "${GREEN}Test database already exists.${NC}"
fi

# Reset test database
echo -e "${YELLOW}Applying migrations and seeding test database...${NC}"
PGPASSWORD=$PG_PASSWORD psql -h 127.0.0.1 -p 54322 -U postgres -d $TEST_DB_NAME -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" 2>/dev/null

# Apply migrations to test database
for migration_file in supabase/migrations/*.sql; do
  echo -e "${YELLOW}Applying migration: $migration_file${NC}"
  PGPASSWORD=$PG_PASSWORD psql -h 127.0.0.1 -p 54322 -U postgres -d $TEST_DB_NAME -f "$migration_file" 2>/dev/null
done

# Apply seed to test database
echo -e "${YELLOW}Seeding test database...${NC}"
PGPASSWORD=$PG_PASSWORD psql -h 127.0.0.1 -p 54322 -U postgres -d $TEST_DB_NAME -f "supabase/seed.sql" 2>/dev/null

# Update the Postgres connection string for PostgREST to use test database
# We have to update the connection string that PostgREST uses
echo -e "${YELLOW}Updating Supabase configuration for test database...${NC}"
# Create a temporary SQL file to modify the PostgREST configuration
cat > /tmp/update_postgrest_config.sql << EOF
-- First, ensure we're working in the postgres database
\c postgres

-- Update the connection string for PostgREST to use the test database
UPDATE supabase_admin.config
SET value = jsonb_set(
  value,
  '{db_connection}',
  to_jsonb('postgres://postgres:${PG_PASSWORD}@localhost:5432/${TEST_DB_NAME}')
)
WHERE name = 'postgrest';
EOF

# Apply the configuration update
PGPASSWORD=$PG_PASSWORD psql -h 127.0.0.1 -p 54322 -U postgres -f /tmp/update_postgrest_config.sql 2>/dev/null || {
  echo -e "${YELLOW}Could not update PostgREST configuration. Continuing with standard connection.${NC}"
}

# Remove the temporary file
rm /tmp/update_postgrest_config.sql

echo -e "\n${YELLOW}=== Running Tests ===${NC}"
# Change to the backend directory
cd "$ROOT_DIR/backend"

# Set environment variables for testing
export ENVIRONMENT="test"
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_DB_NAME="$TEST_DB_NAME"
export PGDATABASE="$TEST_DB_NAME"  # Set PostgreSQL database name
export PGOPTIONS="-c search_path=public"  # Ensure we're using the public schema

# Determine test path
TEST_PATH="tests/"
if [ -n "$1" ] && [ "$1" != "--help" ]; then
  TEST_PATH="$1"
fi

# Run tests
echo -e "${YELLOW}Running tests: $TEST_PATH${NC}"
python -m pytest $TEST_PATH -v

# Check if tests passed
if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}All tests passed successfully!${NC}"
  exit 0
else
  echo -e "\n${RED}Tests failed.${NC}"
  exit 1
fi
