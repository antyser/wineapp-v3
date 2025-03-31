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
   - Copy `.env.example` to `.env`
   - For local development, the default values will work with local Supabase
   - For production, update with your Supabase project URL and API keys

4. **Install dependencies**:
   ```
   uv venv
   source .venv/bin/activate
   uv pip install -e .
   ```

5. **Run the server**:
   ```
   python run.py
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

### Testing

Tests require a running local Supabase instance. There are two ways to run tests:

1. **Run tests with Supabase automatically**:
   
   Use the provided script that will start Supabase, run tests, and stop Supabase:
   ```
   ./run_with_supabase.sh
   ```
   
   **Note for OrbStack users**: The script will automatically detect and start OrbStack if needed.

2. **Manual approach**:
   
   a. First, ensure Docker/OrbStack is running, then start the local Supabase server:
   ```
   cd .. && supabase start
   ```
   
   b. Then run the tests:
   ```
   python -m pytest tests/
   ```
   
   c. When done, stop the Supabase server:
   ```
   cd .. && supabase stop
   ```

The tests use the real local Supabase instance rather than mocks to ensure accurate testing of database interactions. 