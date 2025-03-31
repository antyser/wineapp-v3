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

## Setup and Installation

### Prerequisites

- Node.js and npm (for frontend)
- Expo CLI
- Python 3.12+
- uv package manager
- Supabase account

### Frontend Setup

1. **Install dependencies**:
   ```
   cd frontend
   npm install
   ```

2. **Start the development server**:
   ```
   npm start
   ```

3. **Run on a specific platform**:
   ```
   npm run ios     # for iOS
   npm run android # for Android
   npm run web     # for web
   ```

### Backend Setup

1. **Create a Supabase Project**:
   - Go to [Supabase](https://supabase.com/) and create a new project
   - Note your project URL and API keys

2. **Set up environment**:
   ```
   cd backend
   uv venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   uv pip install -e .
   ```

3. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Update with your Supabase project URL and API keys

4. **Set up the database schema**:
   - In the Supabase dashboard, go to the SQL Editor
   - Run the SQL schema in `backend/db/schema.sql`

5. **Run the server**:
   ```
   python run.py
   ```

## Development

Both frontend and backend code have their own README files with more detailed development instructions.

- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)

## License

[MIT](LICENSE) 