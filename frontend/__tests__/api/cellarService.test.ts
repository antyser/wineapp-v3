import { cellarService } from '../../src/api/cellarService';
import { apiClient } from '../../src/api/apiClient';

// Mock apiClient
jest.mock('../../src/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }
}));

describe('Cellar Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getCellars', () => {
    test('fetches cellars with default parameters', async () => {
      // Mock successful response
      const mockResponse = {
        items: [
          {
            id: '1',
            name: 'Home Collection',
            user_id: 'user123',
            sections: ['Main Rack', 'Wine Fridge'],
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
          {
            id: '2',
            name: 'Office Collection',
            user_id: 'user123',
            sections: ['Cabinet'],
            created_at: '2023-02-01T00:00:00Z',
            updated_at: '2023-02-01T00:00:00Z',
          }
        ],
        total: 2
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await cellarService.getCellars();

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/cellars', {
        params: {
          page: 1,
          limit: 20,
          sort: 'name',
          order: 'asc'
        }
      });

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });

    test('fetches cellars with custom parameters', async () => {
      // Mock successful response
      const mockResponse = {
        items: [
          {
            id: '2',
            name: 'Office Collection',
            user_id: 'user123',
            sections: ['Cabinet'],
            created_at: '2023-02-01T00:00:00Z',
            updated_at: '2023-02-01T00:00:00Z',
          }
        ],
        total: 1
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method with custom parameters
      const result = await cellarService.getCellars({
        page: 2,
        limit: 10,
        sort: 'created_at',
        order: 'desc'
      });

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/cellars', {
        params: {
          page: 2,
          limit: 10,
          sort: 'created_at',
          order: 'desc'
        }
      });

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });

    test('handles API errors', async () => {
      // Mock error response
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      // Call the method and expect it to throw
      await expect(cellarService.getCellars()).rejects.toThrow('Network error');
    });
  });

  describe('getCellarById', () => {
    test('fetches a cellar by ID', async () => {
      // Mock successful response
      const mockResponse = {
        id: '1',
        name: 'Home Collection',
        user_id: 'user123',
        sections: ['Main Rack', 'Wine Fridge'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await cellarService.getCellarById('1');

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/cellars/1');

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });

    test('handles API errors', async () => {
      // Mock error response
      const error = new Error('Cellar not found');
      apiClient.get.mockRejectedValue(error);

      // Call the method and expect it to throw
      await expect(cellarService.getCellarById('999')).rejects.toThrow('Cellar not found');
    });
  });

  describe('createCellar', () => {
    test('creates a new cellar', async () => {
      // Mock successful response
      const mockResponse = {
        id: '3',
        name: 'New Collection',
        user_id: 'user123',
        sections: ['Shelf 1', 'Shelf 2'],
        created_at: '2023-03-01T00:00:00Z',
        updated_at: '2023-03-01T00:00:00Z',
      };
      apiClient.post.mockResolvedValue({ data: mockResponse });

      // Create cellar data
      const cellarData = {
        name: 'New Collection',
        sections: ['Shelf 1', 'Shelf 2']
      };

      // Call the method
      const result = await cellarService.createCellar(cellarData);

      // Check apiClient was called with correct parameters
      expect(apiClient.post).toHaveBeenCalledWith('/cellars', cellarData);

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });

    test('handles API errors', async () => {
      // Mock error response
      const error = new Error('Failed to create cellar');
      apiClient.post.mockRejectedValue(error);

      // Create cellar data
      const cellarData = {
        name: 'Invalid Collection',
        sections: []
      };

      // Call the method and expect it to throw
      await expect(cellarService.createCellar(cellarData)).rejects.toThrow('Failed to create cellar');
    });
  });

  describe('updateCellar', () => {
    test('updates an existing cellar', async () => {
      // Mock successful response
      const mockResponse = {
        id: '1',
        name: 'Updated Collection',
        user_id: 'user123',
        sections: ['New Rack', 'Wine Fridge'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-03-15T00:00:00Z',
      };
      apiClient.put.mockResolvedValue({ data: mockResponse });

      // Update cellar data
      const cellarData = {
        name: 'Updated Collection',
        sections: ['New Rack', 'Wine Fridge']
      };

      // Call the method
      const result = await cellarService.updateCellar('1', cellarData);

      // Check apiClient was called with correct parameters
      expect(apiClient.put).toHaveBeenCalledWith('/cellars/1', cellarData);

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });

    test('handles API errors', async () => {
      // Mock error response
      const error = new Error('Failed to update cellar');
      apiClient.put.mockRejectedValue(error);

      // Update cellar data
      const cellarData = {
        name: 'Invalid Update',
        sections: []
      };

      // Call the method and expect it to throw
      await expect(cellarService.updateCellar('999', cellarData)).rejects.toThrow('Failed to update cellar');
    });
  });

  describe('deleteCellar', () => {
    test('deletes a cellar', async () => {
      // Mock successful response
      const mockResponse = { success: true };
      apiClient.delete.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await cellarService.deleteCellar('1');

      // Check apiClient was called with correct parameters
      expect(apiClient.delete).toHaveBeenCalledWith('/cellars/1');

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });

    test('handles API errors', async () => {
      // Mock error response
      const error = new Error('Failed to delete cellar');
      apiClient.delete.mockRejectedValue(error);

      // Call the method and expect it to throw
      await expect(cellarService.deleteCellar('999')).rejects.toThrow('Failed to delete cellar');
    });
  });

  describe('getBottlesByCellarId', () => {
    test('fetches bottles for a cellar', async () => {
      // Mock successful response
      const mockResponse = {
        items: [
          {
            id: '101',
            cellar_id: '1',
            wine_id: '201',
            section: 'Main Rack',
            quantity: 2,
            purchase_date: '2023-03-15T00:00:00Z',
            purchase_price: 89.99,
            notes: 'Gift from John',
            drink_by_date: '2030-01-01T00:00:00Z',
            created_at: '2023-03-15T00:00:00Z',
            updated_at: '2023-03-15T00:00:00Z',
            wine: {
              id: '201',
              name: 'Opus One 2018',
              producer: 'Opus One Winery',
              region: 'Napa Valley',
              country: 'USA',
              wine_type: 'Red',
              vintage: 2018,
              varietal: 'Cabernet Blend',
              average_price: 349.99,
              rating: 4.7,
              image_url: 'https://example.com/wine201.jpg',
            }
          }
        ],
        total: 1
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await cellarService.getBottlesByCellarId('1');

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/cellars/1/bottles', {
        params: {
          page: 1,
          limit: 20,
          sort: 'added_date',
          order: 'desc'
        }
      });

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });

    test('fetches bottles for a cellar with custom parameters', async () => {
      // Mock successful response
      const mockResponse = {
        items: [
          {
            id: '102',
            cellar_id: '1',
            wine_id: '202',
            section: 'Wine Fridge',
            quantity: 3,
            purchase_date: '2023-02-10T00:00:00Z',
            purchase_price: 45.50,
            notes: '',
            drink_by_date: '2026-01-01T00:00:00Z',
            created_at: '2023-02-10T00:00:00Z',
            updated_at: '2023-02-10T00:00:00Z',
            wine: {
              id: '202',
              name: 'Stag\'s Leap Artemis 2019',
              producer: 'Stag\'s Leap',
              region: 'Napa Valley',
              country: 'USA',
              wine_type: 'Red',
              vintage: 2019,
              varietal: 'Cabernet Sauvignon',
              average_price: 69.99,
              rating: 4.3,
              image_url: 'https://example.com/wine202.jpg',
            }
          }
        ],
        total: 1
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method with custom parameters
      const result = await cellarService.getBottlesByCellarId('1', {
        page: 2,
        limit: 10,
        sort: 'price',
        order: 'asc',
        section: 'Wine Fridge'
      });

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/cellars/1/bottles', {
        params: {
          page: 2,
          limit: 10,
          sort: 'price',
          order: 'asc',
          section: 'Wine Fridge'
        }
      });

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });
  });

  describe('addBottle', () => {
    test('adds a bottle to a cellar', async () => {
      // Mock successful response
      const mockResponse = {
        id: '103',
        cellar_id: '1',
        wine_id: '203',
        section: 'Main Rack',
        quantity: 1,
        purchase_date: '2023-04-20T00:00:00Z',
        purchase_price: 125.00,
        notes: 'Special occasion',
        drink_by_date: '2028-01-01T00:00:00Z',
        created_at: '2023-04-20T00:00:00Z',
        updated_at: '2023-04-20T00:00:00Z',
      };
      apiClient.post.mockResolvedValue({ data: mockResponse });

      // Bottle data
      const bottleData = {
        section: 'Main Rack',
        quantity: 1,
        purchase_date: '2023-04-20T00:00:00Z',
        purchase_price: 125.00,
        notes: 'Special occasion',
        drink_by_date: '2028-01-01T00:00:00Z',
      };

      // Call the method
      const result = await cellarService.addBottle('1', '203', bottleData);

      // Check apiClient was called with correct parameters
      expect(apiClient.post).toHaveBeenCalledWith('/cellars/1/bottles', {
        wine_id: '203',
        ...bottleData
      });

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateBottle', () => {
    test('updates a bottle', async () => {
      // Mock successful response
      const mockResponse = {
        id: '101',
        cellar_id: '1',
        wine_id: '201',
        section: 'Wine Fridge',
        quantity: 3,
        purchase_date: '2023-03-15T00:00:00Z',
        purchase_price: 89.99,
        notes: 'Updated notes',
        drink_by_date: '2030-01-01T00:00:00Z',
        created_at: '2023-03-15T00:00:00Z',
        updated_at: '2023-04-25T00:00:00Z',
      };
      apiClient.put.mockResolvedValue({ data: mockResponse });

      // Update bottle data
      const bottleData = {
        section: 'Wine Fridge',
        quantity: 3,
        notes: 'Updated notes'
      };

      // Call the method
      const result = await cellarService.updateBottle('101', bottleData);

      // Check apiClient was called with correct parameters
      expect(apiClient.put).toHaveBeenCalledWith('/bottles/101', bottleData);

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });
  });

  describe('removeBottle', () => {
    test('removes a bottle', async () => {
      // Mock successful response
      const mockResponse = { success: true };
      apiClient.delete.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await cellarService.removeBottle('101');

      // Check apiClient was called with correct parameters
      expect(apiClient.delete).toHaveBeenCalledWith('/bottles/101');

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getCellarStatistics', () => {
    test('gets statistics for all cellars', async () => {
      // Mock successful response
      const mockResponse = {
        total_bottles: 42,
        total_value: 3500.50,
        bottles_by_type: { 'Red': 30, 'White': 12 },
        bottles_by_region: { 'Bordeaux': 15, 'Burgundy': 10, 'Napa': 17 },
        bottles_by_vintage: { '2018': 20, '2019': 15, '2020': 7 }
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await cellarService.getCellarStatistics();

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/cellars/statistics');

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });

    test('gets statistics for a specific cellar', async () => {
      // Mock successful response
      const mockResponse = {
        total_bottles: 20,
        total_value: 1800.25,
        bottles_by_type: { 'Red': 15, 'White': 5 },
        bottles_by_region: { 'Bordeaux': 10, 'Napa': 10 },
        bottles_by_vintage: { '2018': 12, '2019': 8 }
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method with a cellar ID
      const result = await cellarService.getCellarStatistics('1');

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/cellars/1/statistics');

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });
  });
});
