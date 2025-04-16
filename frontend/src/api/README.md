# Generated API Client

This directory contains the Wine App API client generated from the OpenAPI specification. The client is generated using [@hey-api/openapi-ts](https://github.com/hey-api/openapi-ts).

## Directory Structure

- `generated/` - Contains the auto-generated files from the OpenAPI specification
- `openapi.json` - The OpenAPI specification used to generate the client
- `generatedClient.ts` - Configuration wrapper for the generated client
- `testGeneratedClient.ts` - Example functions demonstrating how to use the client
- `index.ts` - Main entry point that exports both new and legacy APIs

## Updating the API Client

To update the API client with the latest OpenAPI specification:

```bash
npm run generate-api
```

This will:
1. Download the latest OpenAPI specification from the backend server
2. Generate TypeScript types and client code
3. Output the generated files to `src/api/generated/`

## Using the Generated Client

### Import the API Client

```typescript
// Import the entire API
import { api } from '../api';

// Or import the example helper functions
import { searchWines, getWineById } from '../api';

// Or import specific operations from the generated client
import { 
  searchWinesEndpointApiV1SearchPost,
  getOneWineApiV1WinesWineIdGet 
} from '../api/generated';
```

### Make API Calls

Using the helper functions:

```typescript
// Search for wines
const wines = await searchWines('cabernet');

// Get wine details
const wine = await getWineById('123');
```

Using the generated operations directly:

```typescript
import { api } from '../api';

// Search for wines
const searchResponse = await api.searchWinesEndpointApiV1SearchPost({
  body: {
    text_input: 'cabernet',
    image_url: null
  }
});
const wines = searchResponse.data;

// Get wine details
const wineResponse = await api.getOneWineApiV1WinesWineIdGet({
  path: { wine_id: '123' }
});
const wine = wineResponse.data;
```

## Migration from wineService (Legacy) to Generated Client

The `wineService.ts` file has been updated to use console warnings when its methods are called. This helps identify places in the code that still use the legacy API.

### Migration Examples

#### For searching wines:

**Legacy approach (DEPRECATED):**
```typescript
import { wineService } from '../api';
const wines = await wineService.searchWines('cabernet');
```

**New approach (recommended helper function):**
```typescript
import { searchWines } from '../api';
const wines = await searchWines('cabernet');
```

**New approach (direct API call):**
```typescript
import { api } from '../api';
const response = await api.searchWinesEndpointApiV1SearchPost({
  body: {
    text_input: 'cabernet',
    image_url: null
  }
});
const wines = response.data;
```

#### For getting wine details:

**Legacy approach (DEPRECATED):**
```typescript
import { wineService } from '../api';
const wine = await wineService.getWineById('123');
```

**New approach (recommended helper function):**
```typescript
import { getWineById } from '../api';
const wine = await getWineById('123');
```

**New approach (direct API call):**
```typescript
import { api } from '../api';
const response = await api.getOneWineApiV1WinesWineIdGet({
  path: { wine_id: '123' }
});
const wine = response.data;
```

## Legacy API Services

The directory still contains legacy API services that are being phased out:

- `apiClient.ts` - Original Axios-based API client
- `wineService.ts` - Wine-related API functions (now shows deprecation warnings)
- `cellarService.ts` - Cellar management API functions

These are maintained for backward compatibility but will be removed in future updates. New code should use the generated client.

## Migration Strategy

This API client setup supports gradual migration from the old services to the new generated client:

1. New components should use the generated client via `api`
2. Gradually migrate existing components from legacy services
3. Eventually, legacy services will be removed

## Configuration

The client configuration is in `generatedClient.ts`. It handles:

- Setting the correct base URL based on environment (web, iOS, Android)
- Adding auth headers via Supabase session
- Logging requests and responses

You can update this configuration as needed for your environment.

## Benefits

- **Type safety**: All API parameters and responses are fully typed
- **OpenAPI alignment**: Client is always in sync with the backend
- **Automatic updates**: Easy to regenerate when the API changes 