import {
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
  UpdateCellarWineRequest
} from './cellarService';

// Mock data
const mockCellars: Cellar[] = [
  {
    id: '1',
    user_id: '443ce2fe-1d5b-48af-99f3-15329714b63d',
    name: 'My Home Collection',
    sections: ['Main Rack', 'Wine Fridge', 'Cellar'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: '443ce2fe-1d5b-48af-99f3-15329714b63d',
    name: 'Vacation Home',
    sections: ['Kitchen', 'Bar'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const mockWines = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Château Margaux',
    region: 'Bordeaux',
    country: 'France',
    winery: 'Château Margaux',
    vintage: '2015',
    type: 'Red',
    varietal: 'Cabernet Sauvignon',
    average_price: 899.99,
    description: 'An exceptional vintage with profound depth and balance.',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Opus One',
    region: 'Napa Valley',
    country: 'USA',
    winery: 'Opus One Winery',
    vintage: '2018',
    type: 'Red',
    varietal: 'Cabernet Blend',
    average_price: 399.99,
    description: 'Elegant Bordeaux-style blend with exceptional aging potential.',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Dom Pérignon',
    region: 'Champagne',
    country: 'France',
    winery: 'Moët & Chandon',
    vintage: '2010',
    type: 'Sparkling',
    varietal: 'Chardonnay/Pinot Noir',
    average_price: 249.99,
    description: 'Iconic champagne with exceptional finesse and complexity.',
  }
];

const mockCellarWines: CellarWine[] = [
  {
    id: '101',
    cellar_id: '1',
    wine_id: '11111111-1111-1111-1111-111111111111',
    purchase_date: '2023-05-15',
    purchase_price: 850.00,
    quantity: 2,
    section: 'Main Rack',
    status: 'in_stock',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    wine: mockWines[0] as any,
  },
  {
    id: '102',
    cellar_id: '1',
    wine_id: '22222222-2222-2222-2222-222222222222',
    purchase_date: '2023-06-20',
    purchase_price: 375.00,
    quantity: 3,
    section: 'Wine Fridge',
    status: 'in_stock',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    wine: mockWines[1] as any,
  },
  {
    id: '201',
    cellar_id: '2',
    wine_id: '33333333-3333-3333-3333-333333333333',
    purchase_date: '2023-07-10',
    purchase_price: 230.00,
    quantity: 4,
    section: 'Bar',
    status: 'in_stock',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    wine: mockWines[2] as any,
  }
];

// Helper functions for the mock service
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock implementation of the cellar service
export const mockCellarService = {
  getCellars: async (params?: CellarListParams): Promise<CellarListResult> => {
    await delay(500); // Simulate network delay
    const userId = params?.user_id || '443ce2fe-1d5b-48af-99f3-15329714b63d';

    const filteredCellars = mockCellars.filter(cellar => cellar.user_id === userId);

    return {
      items: filteredCellars,
      total: filteredCellars.length
    };
  },

  getCellar: async (id: string): Promise<Cellar> => {
    await delay(500);
    const cellar = mockCellars.find(c => c.id === id);
    if (!cellar) {
      throw new Error(`Cellar with ID ${id} not found`);
    }
    return cellar;
  },

  createCellar: async (cellar: CreateCellarRequest): Promise<Cellar> => {
    await delay(500);
    const newCellar: Cellar = {
      id: `new-${Date.now()}`,
      user_id: cellar.user_id,
      name: cellar.name,
      sections: cellar.sections || [],
      image_url: cellar.image_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockCellars.push(newCellar);
    return newCellar;
  },

  updateCellar: async (id: string, cellar: UpdateCellarRequest): Promise<Cellar> => {
    await delay(500);
    const index = mockCellars.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Cellar with ID ${id} not found`);
    }

    mockCellars[index] = {
      ...mockCellars[index],
      ...cellar,
      updated_at: new Date().toISOString(),
    };

    return mockCellars[index];
  },

  deleteCellar: async (id: string): Promise<void> => {
    await delay(500);
    const index = mockCellars.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Cellar with ID ${id} not found`);
    }

    mockCellars.splice(index, 1);

    // Also delete related cellar wines
    const cellarWineIndices = [];
    for (let i = mockCellarWines.length - 1; i >= 0; i--) {
      if (mockCellarWines[i].cellar_id === id) {
        cellarWineIndices.push(i);
      }
    }

    for (const idx of cellarWineIndices) {
      mockCellarWines.splice(idx, 1);
    }
  },

  getCellarWines: async (params: CellarWineListParams): Promise<CellarWineListResult> => {
    await delay(500);
    const { cellar_id, section, status, query } = params;

    let filteredWines = mockCellarWines.filter(cw => cw.cellar_id === cellar_id);

    if (section) {
      filteredWines = filteredWines.filter(cw => cw.section === section);
    }

    if (status) {
      filteredWines = filteredWines.filter(cw => cw.status === status);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredWines = filteredWines.filter(cw =>
        cw.wine.name.toLowerCase().includes(lowerQuery) ||
        cw.wine.varietal?.toLowerCase().includes(lowerQuery) ||
        cw.wine.region?.toLowerCase().includes(lowerQuery)
      );
    }

    return {
      items: filteredWines,
      total: filteredWines.length
    };
  },

  getCellarStatistics: async (cellar_id: string): Promise<CellarStatistics> => {
    await delay(500);
    const cellarWines = mockCellarWines.filter(cw => cw.cellar_id === cellar_id);

    const totalBottles = cellarWines.reduce((sum, cw) => sum + cw.quantity, 0);

    const totalValue = cellarWines.reduce((sum, cw) => {
      return sum + (cw.purchase_price || 0) * cw.quantity;
    }, 0);

    const bottlesByType: Record<string, number> = {};
    const bottlesByRegion: Record<string, number> = {};
    const bottlesByVintage: Record<string, number> = {};

    for (const cw of cellarWines) {
      // By type
      const type = cw.wine.type || 'Unknown';
      bottlesByType[type] = (bottlesByType[type] || 0) + cw.quantity;

      // By region
      const region = cw.wine.region || 'Unknown';
      bottlesByRegion[region] = (bottlesByRegion[region] || 0) + cw.quantity;

      // By vintage
      const vintage = cw.wine.vintage || 'Unknown';
      bottlesByVintage[vintage] = (bottlesByVintage[vintage] || 0) + cw.quantity;
    }

    return {
      total_bottles: totalBottles,
      total_value: totalValue,
      bottles_by_type: bottlesByType,
      bottles_by_region: bottlesByRegion,
      bottles_by_vintage: bottlesByVintage
    };
  },

  getCellarWine: async (cellar_wine_id: string): Promise<CellarWine> => {
    await delay(500);
    const cellarWine = mockCellarWines.find(cw => cw.id === cellar_wine_id);
    if (!cellarWine) {
      throw new Error(`Cellar wine with ID ${cellar_wine_id} not found`);
    }
    return cellarWine;
  },

  addWineToCellar: async (cellarWine: AddWineToCellarRequest): Promise<CellarWine> => {
    await delay(500);
    const wine = mockWines.find(w => w.id === cellarWine.wine_id);
    if (!wine) {
      throw new Error(`Wine with ID ${cellarWine.wine_id} not found`);
    }

    const newCellarWine: CellarWine = {
      id: `new-${Date.now()}`,
      cellar_id: cellarWine.cellar_id,
      wine_id: cellarWine.wine_id,
      purchase_date: cellarWine.purchase_date,
      purchase_price: cellarWine.purchase_price,
      quantity: cellarWine.quantity,
      size: cellarWine.size,
      section: cellarWine.section,
      condition: cellarWine.condition,
      status: cellarWine.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      wine: wine as any,
    };

    mockCellarWines.push(newCellarWine);
    return newCellarWine;
  },

  updateCellarWine: async (id: string, cellarWine: UpdateCellarWineRequest): Promise<CellarWine> => {
    await delay(500);
    const index = mockCellarWines.findIndex(cw => cw.id === id);
    if (index === -1) {
      throw new Error(`Cellar wine with ID ${id} not found`);
    }

    mockCellarWines[index] = {
      ...mockCellarWines[index],
      ...cellarWine,
      updated_at: new Date().toISOString(),
    };

    return mockCellarWines[index];
  },

  removeCellarWine: async (id: string): Promise<void> => {
    await delay(500);
    const index = mockCellarWines.findIndex(cw => cw.id === id);
    if (index === -1) {
      throw new Error(`Cellar wine with ID ${id} not found`);
    }

    mockCellarWines.splice(index, 1);
  },
};

export default mockCellarService;
