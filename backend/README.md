# Wine App Backend

This is the backend service for the Wine App, built with FastAPI and Supabase.

## Prerequisites

- Python 3.12+
- uv package manager
- Docker or OrbStack for local Supabase
- Supabase CLI

## Setup

1. **Local development with Supabase**:
   - Install [Docker](https://www.docker.com/get-started/) or [OrbStack](https://orbstack.dev/) (faster alternative for macOS)
   - Install [Supabase CLI](https://supabase.com/docs/guides/cli)
   - Run `supabase start` from the project root

2. **Set up the database schema**:
   - The schema will be automatically applied when starting Supabase locally
   - For production, use the Supabase dashboard SQL Editor to run the SQL schema in `db/schema.sql`

3. **Set up environment variables**:
   - The app supports two environments: `development` (default) and `production`
   - For development: Copy `.env.example` to `.env.development` or use the provided `.env.dev`
   - For production: Copy `.env.example` to `.env.production` and update with your Supabase project URL and API keys
   - The app loads the appropriate environment file based on the `ENVIRONMENT` variable

4. **Install dependencies**:
   ```
   uv venv
   source .venv/bin/activate
   uv pip install -e .
   ```

5. **Run the server**:
   ```
   # For development (default)
   python run.py
   
   # For production
   ENVIRONMENT=production python run.py
   ```

## API Documentation

Once the server is running, you can access the API documentation at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Development

### Project Structure

- `app/`: Main application package
  - `api/`: API endpoints
  - `core/`: Core functionality (config, dependencies)
  - `schemas/`: Pydantic models
  - `services/`: Business logic
  - `utils/`: Utility functions
- `db/`: Database migrations and schema

### Environment Configuration

The application uses three environment types:

1. **Development** (`ENVIRONMENT=development`)
   - Default environment for local development
   - Connects to local Supabase instance at http://127.0.0.1:54321 using the default `postgres` database
   - Provides detailed logging and fallback options
   - Environment file: `.env.development` or `.env.dev`

2. **Test** (`ENVIRONMENT=test`)
   - Used for automated testing
   - Connects to a separate test database (`wineapp_test`) to avoid conflicts with development
   - Allows frontend and backend to run concurrently during testing
   - Environment file: `.env.test`

3. **Production** (`ENVIRONMENT=production`)
   - Used for deployed instances
   - Requires properly configured Supabase credentials
   - More strict error handling
   - Environment file: `.env.production`

### Running the Development Server

Use our development script to start the backend server with the correct environment settings:

```bash
# Make the script executable (first time only)
chmod +x scripts/dev.sh

# Run the development server
./scripts/dev.sh

# Optional: Reset the database before starting the server
./scripts/dev.sh --reset
```

This script will:
1. Check if Supabase is running and start it if needed
2. Optionally reset the development database if the `--reset` flag is provided
3. Run the backend server in development mode

### Testing

Tests run using the test environment and connect to a separate test database.

#### Easiest way to run tests

Use our comprehensive test script that will:
1. Check if Supabase is running and start it if needed
2. Create and reset a test database with fresh schema and seed data
3. Run the tests with the correct environment and connection settings

```bash
# Make the script executable (first time only)
chmod +x scripts/test.sh

# Run all tests
./scripts/test.sh
```

#### Alternative methods

1. **Run specific test files or functions**:
   ```bash
   # Run a specific test file
   ./scripts/test.sh tests/wines/test_service.py

   # Run a specific test function
   ./scripts/test.sh tests/wines/test_service.py::test_get_wines
   ```

The tests use a separate test database to ensure they don't interfere with your development environment. This allows you to run tests while the frontend is connected to the development database. 