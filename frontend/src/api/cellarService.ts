import { apiClient } from './apiClient';
import { Wine } from './wineService';

export interface Cellar {
  id: string;
  user_id: string;
  name: string;
  sections: string[];
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CellarWine {
  id: string;
  cellar_id: string;
  wine_id: string;
  purchase_date?: string;
  purchase_price?: number;
  quantity: number;
  size?: string;
  section?: string;
  condition?: string;
  status: 'in_stock' | 'consumed' | 'gifted' | 'sold';
  created_at: string;
  updated_at: string;
  wine?: Wine;
}

export interface CellarStatistics {
  totalBottles: number;
  totalValue: number;
  averageBottlePrice: number;
  wineTypeDistribution: Record<string, number>;
  regionDistribution: Record<string, number>;
  vintageDistribution: Record<string, number>;
}

interface CellarsResponse {
  cellars: Cellar[];
  total: number;
}

interface CellarResponse {
  cellar: Cellar;
}

interface CellarWinesResponse {
  cellarWines: CellarWine[];
  total: number;
}

interface CellarWineResponse {
  cellarWine: CellarWine;
}

export const cellarService = {
  // Get all user's cellars
  getCellars: async (): Promise<CellarsResponse> => {
    console.log('Calling getCellars API');
    const response = await apiClient.get('/cellars');
    return response.data;
  },

  // Get cellar by ID
  getCellarById: async (id: string): Promise<Cellar> => {
    console.log(`Calling getCellarById API for ID: ${id}`);
    const response = await apiClient.get(`/cellars/${id}`);
    return response.data.cellar;
  },

  // Create a new cellar
  createCellar: async (cellarData: Partial<Cellar>): Promise<Cellar> => {
    console.log('Calling createCellar API with data:', cellarData);
    const response = await apiClient.post('/cellars', cellarData);
    console.log('Create cellar API response:', response.data);
    return response.data;
  },

  // Update an existing cellar
  updateCellar: async (id: string, cellarData: Partial<Cellar>): Promise<Cellar> => {
    console.log(`Calling updateCellar API for ID: ${id} with data:`, cellarData);
    const response = await apiClient.patch(`/cellars/${id}`, cellarData);
    return response.data.cellar;
  },

  // Delete a cellar
  deleteCellar: async (id: string): Promise<void> => {
    console.log(`Calling deleteCellar API for ID: ${id}`);
    await apiClient.delete(`/cellars/${id}`);
  },

  // Get wines in a cellar
  getBottlesByCellarId: async (cellarId: string): Promise<CellarWinesResponse> => {
    console.log(`Calling getBottlesByCellarId API for cellarId: ${cellarId}`);
    const response = await apiClient.get(`/cellars/${cellarId}/bottles`);
    return response.data;
  },

  // Add a wine to a cellar
  addBottle: async (cellarId: string, bottleData: Partial<CellarWine>): Promise<CellarWine> => {
    console.log(`Calling addBottle API for cellarId: ${cellarId} with data:`, bottleData);
    const response = await apiClient.post(`/cellars/${cellarId}/bottles`, bottleData);
    return response.data.cellarWine;
  },

  // Update a wine in a cellar
  updateBottle: async (cellarId: string, bottleId: string, bottleData: Partial<CellarWine>): Promise<CellarWine> => {
    console.log(`Calling updateBottle API for cellarId: ${cellarId}, bottleId: ${bottleId} with data:`, bottleData);
    const response = await apiClient.patch(`/cellars/${cellarId}/bottles/${bottleId}`, bottleData);
    return response.data.cellarWine;
  },

  // Remove a wine from a cellar
  removeBottle: async (cellarId: string, bottleId: string): Promise<void> => {
    console.log(`Calling removeBottle API for cellarId: ${cellarId}, bottleId: ${bottleId}`);
    await apiClient.delete(`/cellars/${cellarId}/bottles/${bottleId}`);
  },

  // Get cellar statistics
  getCellarStatistics: async (cellarId: string): Promise<CellarStatistics> => {
    console.log(`Calling getCellarStatistics API for cellarId: ${cellarId}`);
    const response = await apiClient.get(`/cellars/${cellarId}/statistics`);
    return response.data.statistics;
  }
};

export default cellarService;
