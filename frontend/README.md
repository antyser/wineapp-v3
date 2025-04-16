# Wine App Frontend

The frontend mobile application for Wine App, built with Expo/React Native.

## Prerequisites

- Node.js and npm
- Expo CLI: `npm install -g expo-cli`

## Setup

1. **Install dependencies**:
   ```
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

## Development

### Project Structure

- `App.tsx`: Main application component
- `src/`: Source code directory
  - `components/`: Reusable UI components
  - `screens/`: App screens
  - `navigation/`: Navigation configuration
  - `theme/`: Theme and styling
  - `store/`: State management (Zustand)
  - `api/`: API client and services
  - `utils/`: Utility functions
  - `hooks/`: Custom React hooks
  - `types/`: TypeScript types and interfaces

### API Client

The app uses a generated TypeScript client based on the backend's OpenAPI specification. This provides type-safe API calls and ensures the frontend stays in sync with the backend API.

#### Updating the API Client

To update the API client with the latest OpenAPI specification:

```bash
npm run generate-api
```

This will download the latest OpenAPI spec from the backend server and generate TypeScript types and client code.

#### Using the API Client

```typescript
// Import the API client
import { api } from '../api';

// Example: Search for wines
const response = await api.searchWines({
  text_input: 'cabernet',
  image_url: null
});
const wines = response.data;

// Or use the helper functions for simpler access
import { searchWines } from '../api';
const wines = await searchWines('cabernet');
```

#### Migration from Legacy Services

The codebase is transitioning from manually written API services to the generated client:

- New components should use the generated client via `api`
- Legacy services (`wineService`, `cellarService`) are still available for backward compatibility
- Eventually, legacy services will be removed

For more details, see the [API Client documentation](src/api/README.md).

### State Management

The app uses Zustand for state management. The store is defined in `src/store/useWineStore.ts`.

### Navigation

The app uses React Navigation with a combination of stack and tab navigators:

- `RootNavigator`: Main stack navigator (screens like WineDetails, AddWine)
- `MainTabs`: Bottom tab navigator (Home, MyWines, Chat, Profile)

### UI Components

The app uses React Native Paper for UI components, with a custom theme defined in `src/theme/theme.ts`.

### Code Quality

- **ESLint**: Linting rules defined in `.eslintrc.js`
- **Prettier**: Code formatting rules defined in `.prettierrc`

Run linting:
```
npm run lint
```

Format code:
```
npm run format
```
