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