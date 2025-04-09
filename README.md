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

## Setup and Installation

### Prerequisites

- Node.js and npm (for frontend)
- Expo CLI
- Python 3.12+
- uv package manager
- Docker and Docker Compose (for local Supabase)

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
   # Apply migrations
   supabase db push
   
   # Seed the database (optional)
   psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
   ```

5. **Configure storage buckets**:
   
   The storage service should automatically set up, but you can create additional buckets:
   ```bash
   # Create a bucket for wine label images
   supabase storage create wine-labels
   
   # Set bucket to public
   supabase storage update wine-labels --public
   ```

6. **Access Supabase Studio**:
   
   Open http://localhost:54323 in your browser to access the Supabase Studio interface.

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

- **Reset the database**:
  ```bash
  supabase db reset
  ```

### Storage

- **List buckets**:
  ```bash
  supabase storage list buckets
  ```

- **Create a bucket**:
  ```bash
  supabase storage create <bucket-name>
  ```

- **Make a bucket public**:
  ```bash
  supabase storage update <bucket-name> --public
  ```

- **Upload a file** (using the Supabase JS client in code):
  ```javascript
  const { data, error } = await supabase.storage
    .from('wine-labels')
    .upload('filename.jpg', file);
  ```

- **Get a public URL** (using the Supabase JS client in code):
  ```javascript
  const url = supabase.storage
    .from('wine-labels')
    .getPublicUrl('filename.jpg').data.publicUrl;
  ```

### Authentication

You can test authentication features using the local Supabase Auth service. Create test users through the Supabase Studio interface at http://localhost:54323.

## Development

Both frontend and backend code have their own README files with more detailed development instructions.

- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)

## Stopping Supabase

To stop the local Supabase services:
```bash
supabase stop
```

## License

[MIT](LICENSE)
