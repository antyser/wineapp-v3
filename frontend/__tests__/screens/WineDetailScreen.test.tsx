import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import WineDetailScreen from '../../src/screens/WineDetailScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: { wineId: '123' }
  }),
}));

// Mock wine service
jest.mock('../../src/api/wineService', () => ({
  wineService: {
    getWineById: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: '123',
        name: 'Château Margaux 2015',
        producer: 'Château Margaux',
        region: 'Bordeaux',
        country: 'France',
        wine_type: 'Red',
        vintage: 2015,
        varietal: 'Cabernet Sauvignon',
        average_price: 599.99,
        rating: 4.8,
        image_url: 'https://example.com/wine123.jpg',
        tasting_notes: 'Rich blackberry and cassis flavors with hints of cedar and graphite',
        food_pairings: ['Beef', 'Lamb', 'Hard Cheese'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      })
    ),
    getRecommendedWines: jest.fn().mockImplementation(() =>
      Promise.resolve({
        items: [
          {
            id: '456',
            name: 'Latour 2016',
            producer: 'Château Latour',
            region: 'Bordeaux',
            country: 'France',
            wine_type: 'Red',
            vintage: 2016,
            varietal: 'Cabernet Sauvignon',
            average_price: 699.99,
            rating: 4.9,
            image_url: 'https://example.com/wine456.jpg',
          },
          {
            id: '789',
            name: 'Lafite Rothschild 2015',
            producer: 'Château Lafite Rothschild',
            region: 'Bordeaux',
            country: 'France',
            wine_type: 'Red',
            vintage: 2015,
            varietal: 'Cabernet Blend',
            average_price: 649.99,
            rating: 4.7,
            image_url: 'https://example.com/wine789.jpg',
          }
        ],
        total: 2
      })
    ),
    addToWishlist: jest.fn().mockImplementation(() => Promise.resolve({ success: true })),
    removeFromWishlist: jest.fn().mockImplementation(() => Promise.resolve({ success: true })),
    isInWishlist: jest.fn().mockImplementation(() => Promise.resolve(false)),
  }
}));

// Mock cellar service
jest.mock('../../src/api/cellarService', () => ({
  cellarService: {
    getCellars: jest.fn().mockImplementation(() =>
      Promise.resolve({
        items: [
          {
            id: '1',
            name: 'My Collection',
            user_id: 'user123',
            sections: ['Rack 1', 'Rack 2'],
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          }
        ],
        total: 1
      })
    ),
    addBottle: jest.fn().mockImplementation(() => Promise.resolve({ success: true })),
  }
}));

// Mock useAuth hook
jest.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user123' },
  }),
}));

describe('WineDetailScreen Component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    jest.clearAllMocks();
  });

  test('renders wine details correctly', async () => {
    const { findByText, getByTestId } = render(<WineDetailScreen />);

    // Check that wine details are displayed
    const wineName = await findByText('Château Margaux 2015');
    const producer = await findByText('Château Margaux');
    const region = await findByText('Bordeaux, France');
    const vintage = await findByText('2015');
    const price = await findByText('$599.99');

    expect(wineName).toBeTruthy();
    expect(producer).toBeTruthy();
    expect(region).toBeTruthy();
    expect(vintage).toBeTruthy();
    expect(price).toBeTruthy();

    // Check wine image
    const wineImage = getByTestId('wine-image');
    expect(wineImage).toBeTruthy();
  });

  test('shows loading state initially', () => {
    // Mock getWineById to return a pending promise (loading state)
    require('../../src/api/wineService').wineService.getWineById.mockImplementationOnce(() =>
      new Promise(() => {}) // Never resolves
    );

    const { getByTestId } = render(<WineDetailScreen />);

    // Check loading indicator is displayed
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  test('displays error message when wine fetching fails', async () => {
    // Mock getWineById to reject
    require('../../src/api/wineService').wineService.getWineById.mockImplementationOnce(() =>
      Promise.reject(new Error('Failed to fetch wine details'))
    );

    const { findByText } = render(<WineDetailScreen />);

    // Check error message is displayed
    const errorMessage = await findByText(/Failed to load wine details/);
    expect(errorMessage).toBeTruthy();
  });

  test('navigates back when back button is pressed', async () => {
    const { findByTestId } = render(<WineDetailScreen />);

    // Find and press the back button
    const backButton = await findByTestId('back-button');
    fireEvent.press(backButton);

    // Check if goBack was called
    expect(mockGoBack).toHaveBeenCalled();
  });

  test('adds wine to wishlist when wishlist button is pressed', async () => {
    const addToWishlistMock = require('../../src/api/wineService').wineService.addToWishlist;

    const { findByTestId } = render(<WineDetailScreen />);

    // Find and press the wishlist button
    const wishlistButton = await findByTestId('wishlist-button');
    fireEvent.press(wishlistButton);

    // Check if addToWishlist was called with the correct wine ID
    await waitFor(() => {
      expect(addToWishlistMock).toHaveBeenCalledWith('123');
    });
  });

  test('removes wine from wishlist when already in wishlist', async () => {
    // Mock isInWishlist to return true
    require('../../src/api/wineService').wineService.isInWishlist.mockImplementationOnce(() =>
      Promise.resolve(true)
    );

    const removeFromWishlistMock = require('../../src/api/wineService').wineService.removeFromWishlist;

    const { findByTestId } = render(<WineDetailScreen />);

    // Find and press the wishlist button
    const wishlistButton = await findByTestId('wishlist-button');
    fireEvent.press(wishlistButton);

    // Check if removeFromWishlist was called with the correct wine ID
    await waitFor(() => {
      expect(removeFromWishlistMock).toHaveBeenCalledWith('123');
    });
  });

  test('opens add to cellar modal when add to cellar button is pressed', async () => {
    const { findByTestId, findByText } = render(<WineDetailScreen />);

    // Find and press the add to cellar button
    const addToCellarButton = await findByTestId('add-to-cellar-button');
    fireEvent.press(addToCellarButton);

    // Check if modal is displayed
    const modalTitle = await findByText('Add to Cellar');
    expect(modalTitle).toBeTruthy();
  });

  test('adds bottle to cellar when cellar is selected in modal', async () => {
    const addBottleMock = require('../../src/api/cellarService').cellarService.addBottle;

    const { findByTestId, findByText } = render(<WineDetailScreen />);

    // Open the modal
    const addToCellarButton = await findByTestId('add-to-cellar-button');
    fireEvent.press(addToCellarButton);

    // Select a cellar
    const cellarOption = await findByText('My Collection');
    fireEvent.press(cellarOption);

    // Press confirm button
    const confirmButton = await findByText('Add');
    fireEvent.press(confirmButton);

    // Check if addBottle was called with the correct parameters
    await waitFor(() => {
      expect(addBottleMock).toHaveBeenCalledWith('1', '123', expect.any(Object));
    });
  });

  test('displays recommended wines section', async () => {
    const { findByText } = render(<WineDetailScreen />);

    // Check that recommended wines section is displayed
    const sectionTitle = await findByText('You may also like');
    expect(sectionTitle).toBeTruthy();

    // Check that recommended wines are displayed
    const recommendedWine1 = await findByText('Latour 2016');
    const recommendedWine2 = await findByText('Lafite Rothschild 2015');

    expect(recommendedWine1).toBeTruthy();
    expect(recommendedWine2).toBeTruthy();
  });

  test('navigates to wine detail when recommended wine is pressed', async () => {
    const { findByText } = render(<WineDetailScreen />);

    // Find and press a recommended wine
    const recommendedWine = await findByText('Latour 2016');
    fireEvent.press(recommendedWine);

    // Check if navigation was called with correct wine ID
    expect(mockNavigate).toHaveBeenCalledWith('WineDetail', { wineId: '456' });
  });
});
