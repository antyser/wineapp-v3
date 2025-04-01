export { wineService } from './wineService';
export { cellarService } from './cellarService';

// Re-export interfaces for use in components
export type {
  Wine,
  WineSearchParams,
  WineListResult,
} from './wineService';

export type {
  Cellar,
  CellarWine,
  CellarStatistics,
  CellarListParams,
  CellarWineListParams,
  CellarListResult,
  CellarWineListResult,
  CreateCellarRequest,
  UpdateCellarRequest,
  AddWineToCellarRequest,
  UpdateCellarWineRequest,
} from './cellarService';
