# Wine App

A comprehensive mobile application for wine enthusiasts to discover, track, and organize their wine collection.

## Features

- Wine search and identification
- Label scanning
- Cellar management
- Tasting notes
- AI-powered recommendations
- Wishlist tracking

## Project Structure

- `frontend/`: Expo/React Native application
- `backend/`: FastAPI backend service
- `supabase/`: Supabase local development configuration
- `supabase/migrations/`: Database migrations for schema and RLS policies

## Setup and Installation

### Prerequisites

- Node.js and npm (for frontend)
- Expo CLI
- Python 3.12+
- uv package manager
- Docker and Docker Compose (for local development)

### Quick Start with Docker

The easiest way to get the entire application running is to use Docker Compose:

```bash
# Start all services (backend, frontend, and Supabase)
docker compose -f docker-compose.app.yml up -d

# To stop all services
docker compose -f docker-compose.app.yml down
```

Alternatively, you can use the convenience scripts provided:

```bash
# Start everything
./start-dev.sh

# Stop everything
./stop-dev.sh
```

### Local Supabase Setup

1. **Install Supabase CLI**:
   ```bash
   # Using npm
   npm install -g supabase
   
   # Or using Homebrew on macOS
   brew install supabase/tap/supabase
   ```

2. **Start local Supabase services**:
   ```bash
   # Navigate to the project directory
   cd wineapp-v3
   
   # Start Supabase services
   supabase start
   ```
   This will initialize Docker containers for PostgreSQL, Auth, Storage, and other Supabase services.

3. **Verify local Supabase is running**:
   ```bash
   supabase status
   ```
   This will display information including:
   - Local API URL (typically http://localhost:54321)
   - Local anon key
   - Local database URL

4. **Apply database migrations and seed data**:
   ```bash
   # Apply all migrations (this will run all SQL files in supabase/migrations/ in order)
   supabase db push
   
   # If you encounter issues with supabase db push, you can run migrations manually:
   psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/20240401000000_create_tables.sql
   # Repeat for each migration file in order
   ```

5. **Access Supabase UI**:
   Open http://localhost:54323 in your browser to access the Supabase Studio interface.

### Database Migration Structure

All database changes are managed through migrations in the `supabase/migrations/` directory:

- `20240401000000_create_tables.sql` - Initial schema setup
- `20240401000001_update_wines_table.sql` - Wine table modifications
- `20240626030000_storage_buckets_rls_config.sql` - Storage bucket setup and RLS policies

When developing new features that require database changes:

1. Create a new migration file with a timestamp prefix in `supabase/migrations/`
2. Apply it with `supabase db push` or direct psql command
3. Commit the migration file to version control

### Storage Configuration

The application uses Supabase Storage with the following structure:

- **Bucket**: `wines` - For storing wine images and related files
- **File Path Structure**: `user_id/filename.jpg` - Each user has their own directory
- **Security**: Row-Level Security (RLS) policies ensure users can only access their own files

The storage configuration is handled by the `20240626030000_storage_buckets_rls_config.sql` migration, which:

1. Creates the required storage buckets
2. Sets up RLS policies for secure access
3. Enables public read access while restricting write operations to authenticated users

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   # Create development environment file
   cp .env.example .env.development
   ```
   Update `.env.development` with the following:
   ```
   ENV=dev
   SUPABASE_URL=http://localhost:54321
   SUPABASE_ANON_KEY=<your-local-anon-key>
   EXPO_PUBLIC_API_URL=http://localhost:8000
   ```
   
   The anon key can be found from the output of `supabase status` command.

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Run on a specific platform**:
   ```bash
   npm run ios     # for iOS
   npm run android # for Android
   npm run web     # for web
   ```

### Backend Setup

1. **Set up environment**:
   ```bash
   cd backend
   uv venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   uv pip install -e .
   ```

2. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Update with your local Supabase project URL and API keys:
   ```
   SUPABASE_URL=http://localhost:54321
   SUPABASE_ANON_KEY=<your-local-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-local-service-role-key>
   ```

3. **Run the server**:
   ```bash
   python run.py
   ```

4. **Using Docker** (alternative to local setup):
   ```bash
   # Build and run just the backend
   docker compose -f docker-compose.app.yml up -d backend
   
   # View logs
   docker logs -f wineapp-backend-1
   ```

## Working with Supabase

### Database

- **Access the database directly**:
  ```bash
  psql -h localhost -p 54322 -U postgres -d postgres
  ```

- **Run migrations**:
  ```bash
  supabase db push
  ```

- **Generate SQL migration template**:
  ```bash
  # Create a timestamp-prefixed migration file
  timestamp=$(date "+%Y%m%d%H%M%S")
  touch "supabase/migrations/${timestamp}_description.sql"
  ```

- **Reset the database**:
  ```bash
  supabase db reset
  ```

- **Troubleshooting migrations**:
  If `supabase db push` fails, you can manually apply migrations:
  ```bash
  for f in supabase/migrations/*.sql; do 
    echo "Applying $f"
    psql postgresql://postgres:postgres@localhost:54322/postgres -f "$f"
  done
  ```

### Storage

- **List buckets**:
  ```bash
  # Using the database directly
  psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT * FROM storage.buckets;"
  ```

- **Check storage policies**:
  ```bash
  psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT * FROM pg_policies WHERE tablename = 'objects';"
  ```

- **Upload a file** (using the Supabase JS client in code):
  ```javascript
  // Important: Upload to user's own directory to comply with RLS policies
  const filePath = `${user.id}/${filename}`;
  const { data, error } = await supabase.storage
    .from('wines')
    .upload(filePath, file);
  ```

- **Get a public URL** (using the Supabase JS client in code):
  ```javascript
  const { data: { publicUrl } } = supabase.storage
    .from('wines')
    .getPublicUrl(`${user.id}/${filename}`);
  ```

### Authentication

You can test authentication features using the local Supabase Auth service:

1. Create test users through the Supabase UI (http://localhost:54323)
2. Use the provided demo account (demo@wineapp.com / demo123456)
3. Test anonymous sign-in (for guest users)

## Development Workflow

1. **Start the development environment**:
   ```bash
   # Start all services
   ./start-dev.sh
   
   # Or using Docker directly
   docker compose -f docker-compose.app.yml up -d
   ```

2. **Make database changes**:
   - Create a new migration file in `supabase/migrations/`
   - Apply with `supabase db push` or direct psql command
   - Verify changes in Supabase UI

3. **Test API endpoints**:
   - Backend available at http://localhost:8000
   - API documentation at http://localhost:8000/docs

4. **Run frontend**:
   - Web version at http://localhost:19006
   - Or use Expo Go app on mobile devices

5. **Stop the environment when done**:
   ```bash
   ./stop-dev.sh
   
   # Or using Docker directly
   docker compose -f docker-compose.app.yml down
   ```

## Troubleshooting

- **Database connection issues**: Ensure Supabase is running with `supabase status`
- **Migration failures**: Try applying migrations manually with psql
- **Storage upload errors**: Check that the user has a valid session and is uploading to their own directory
- **Frontend environment issues**: Verify environment variables in `.env.development`

## License

[MIT](LICENSE)
