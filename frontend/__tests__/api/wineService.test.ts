import { wineService } from '../../src/api/wineService';
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

describe('Wine Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getWines', () => {
    test('fetches wines with default parameters', async () => {
      // Mock successful response
      const mockResponse = {
        items: [
          {
            id: '1',
            name: 'Château Margaux 2015',
            producer: 'Château Margaux',
            region: 'Bordeaux',
            country: 'France',
            wine_type: 'Red',
            vintage: 2015,
            varietal: 'Cabernet Sauvignon',
            average_price: 599.99,
            rating: 4.8,
            image_url: 'https://example.com/wine1.jpg',
          },
          {
            id: '2',
            name: 'Dom Pérignon 2010',
            producer: 'Dom Pérignon',
            region: 'Champagne',
            country: 'France',
            wine_type: 'Sparkling',
            vintage: 2010,
            varietal: 'Chardonnay Blend',
            average_price: 199.99,
            rating: 4.9,
            image_url: 'https://example.com/wine2.jpg',
          }
        ],
        total: 2
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await wineService.getWines();

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/wines', {
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

    test('fetches wines with custom parameters', async () => {
      // Mock successful response
      const mockResponse = {
        items: [
          {
            id: '3',
            name: 'Opus One 2018',
            producer: 'Opus One Winery',
            region: 'Napa Valley',
            country: 'USA',
            wine_type: 'Red',
            vintage: 2018,
            varietal: 'Cabernet Blend',
            average_price: 349.99,
            rating: 4.7,
            image_url: 'https://example.com/wine3.jpg',
          }
        ],
        total: 1
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method with custom parameters
      const result = await wineService.getWines({
        page: 2,
        limit: 10,
        sort: 'price',
        order: 'desc',
        type: 'Red',
        region: 'Napa Valley'
      });

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/wines', {
        params: {
          page: 2,
          limit: 10,
          sort: 'price',
          order: 'desc',
          type: 'Red',
          region: 'Napa Valley'
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
      await expect(wineService.getWines()).rejects.toThrow('Network error');
    });
  });

  describe('getWineById', () => {
    test('fetches a wine by ID', async () => {
      // Mock successful response
      const mockResponse = {
        id: '1',
        name: 'Château Margaux 2015',
        producer: 'Château Margaux',
        region: 'Bordeaux',
        country: 'France',
        wine_type: 'Red',
        vintage: 2015,
        varietal: 'Cabernet Sauvignon',
        average_price: 599.99,
        rating: 4.8,
        image_url: 'https://example.com/wine1.jpg',
        tasting_notes: 'Rich blackberry and cassis flavors with hints of cedar and graphite',
        food_pairings: ['Beef', 'Lamb', 'Hard Cheese'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await wineService.getWineById('1');

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/wines/1');

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });

    test('handles API errors', async () => {
      // Mock error response
      const error = new Error('Wine not found');
      apiClient.get.mockRejectedValue(error);

      // Call the method and expect it to throw
      await expect(wineService.getWineById('999')).rejects.toThrow('Wine not found');
    });
  });

  describe('searchWines', () => {
    test('searches wines with query', async () => {
      // Mock successful response
      const mockResponse = {
        items: [
          {
            id: '1',
            name: 'Château Margaux 2015',
            producer: 'Château Margaux',
            region: 'Bordeaux',
            country: 'France',
            wine_type: 'Red',
            vintage: 2015,
            varietal: 'Cabernet Sauvignon',
            average_price: 599.99,
            rating: 4.8,
            image_url: 'https://example.com/wine1.jpg',
          }
        ],
        total: 1
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await wineService.searchWines('Margaux');

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/wines/search', {
        params: {
          query: 'Margaux',
          page: 1,
          limit: 20
        }
      });

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });

    test('handles API errors', async () => {
      // Mock error response
      const error = new Error('Search failed');
      apiClient.get.mockRejectedValue(error);

      // Call the method and expect it to throw
      await expect(wineService.searchWines('Invalid')).rejects.toThrow('Search failed');
    });
  });

  describe('getRecentlyViewedWines', () => {
    test('fetches recently viewed wines', async () => {
      // Mock successful response
      const mockResponse = {
        items: [
          {
            id: '1',
            name: 'Château Margaux 2015',
            producer: 'Château Margaux',
            region: 'Bordeaux',
            country: 'France',
            wine_type: 'Red',
            vintage: 2015,
            varietal: 'Cabernet Sauvignon',
            average_price: 599.99,
            rating: 4.8,
            image_url: 'https://example.com/wine1.jpg',
            viewed_at: '2023-05-01T00:00:00Z'
          }
        ],
        total: 1
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await wineService.getRecentlyViewedWines();

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/wines/recently-viewed', {
        params: {
          limit: 10
        }
      });

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getRecommendedWines', () => {
    test('fetches recommended wines', async () => {
      // Mock successful response
      const mockResponse = {
        items: [
          {
            id: '2',
            name: 'Dom Pérignon 2010',
            producer: 'Dom Pérignon',
            region: 'Champagne',
            country: 'France',
            wine_type: 'Sparkling',
            vintage: 2010,
            varietal: 'Chardonnay Blend',
            average_price: 199.99,
            rating: 4.9,
            image_url: 'https://example.com/wine2.jpg',
          }
        ],
        total: 1
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await wineService.getRecommendedWines('1');

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/wines/1/recommendations', {
        params: {
          limit: 10
        }
      });

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Wishlist operations', () => {
    test('adds wine to wishlist', async () => {
      // Mock successful response
      const mockResponse = { success: true };
      apiClient.post.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await wineService.addToWishlist('1');

      // Check apiClient was called with correct parameters
      expect(apiClient.post).toHaveBeenCalledWith('/wishlist/wines/1');

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });

    test('removes wine from wishlist', async () => {
      // Mock successful response
      const mockResponse = { success: true };
      apiClient.delete.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await wineService.removeFromWishlist('1');

      // Check apiClient was called with correct parameters
      expect(apiClient.delete).toHaveBeenCalledWith('/wishlist/wines/1');

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });

    test('checks if wine is in wishlist', async () => {
      // Mock successful response
      const mockResponse = { inWishlist: true };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await wineService.isInWishlist('1');

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/wishlist/wines/1/check');

      // Check the returned data
      expect(result).toEqual(true);
    });

    test('gets wishlist', async () => {
      // Mock successful response
      const mockResponse = {
        items: [
          {
            id: '1',
            name: 'Château Margaux 2015',
            producer: 'Château Margaux',
            region: 'Bordeaux',
            country: 'France',
            wine_type: 'Red',
            vintage: 2015,
            varietal: 'Cabernet Sauvignon',
            average_price: 599.99,
            rating: 4.8,
            image_url: 'https://example.com/wine1.jpg',
            added_at: '2023-05-01T00:00:00Z'
          }
        ],
        total: 1
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await wineService.getWishlist();

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/wishlist/wines', {
        params: {
          page: 1,
          limit: 20
        }
      });

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });
  });

  describe('addWineViewHistory', () => {
    test('records wine view history', async () => {
      // Mock successful response
      const mockResponse = { success: true };
      apiClient.post.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await wineService.addWineViewHistory('1');

      // Check apiClient was called with correct parameters
      expect(apiClient.post).toHaveBeenCalledWith('/wines/1/view');

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getRatings', () => {
    test('gets wine ratings', async () => {
      // Mock successful response
      const mockResponse = {
        average: 4.5,
        count: 10,
        ratings: [
          { user_id: 'user1', rating: 5, review: 'Excellent wine', date: '2023-05-01T00:00:00Z' },
          { user_id: 'user2', rating: 4, review: 'Very good', date: '2023-04-20T00:00:00Z' }
        ]
      };
      apiClient.get.mockResolvedValue({ data: mockResponse });

      // Call the method
      const result = await wineService.getRatings('1');

      // Check apiClient was called with correct parameters
      expect(apiClient.get).toHaveBeenCalledWith('/wines/1/ratings');

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });
  });

  describe('addRating', () => {
    test('adds a wine rating', async () => {
      // Mock successful response
      const mockResponse = { success: true };
      apiClient.post.mockResolvedValue({ data: mockResponse });

      // Create rating data
      const ratingData = {
        rating: 5,
        review: 'Excellent wine with great structure and finish.'
      };

      // Call the method
      const result = await wineService.addRating('1', ratingData);

      // Check apiClient was called with correct parameters
      expect(apiClient.post).toHaveBeenCalledWith('/wines/1/ratings', ratingData);

      // Check the returned data
      expect(result).toEqual(mockResponse);
    });
  });
});
