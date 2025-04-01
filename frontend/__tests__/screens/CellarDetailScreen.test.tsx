import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CellarDetailScreen from '../../src/screens/CellarDetailScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: { cellarId: '1' }
  }),
}));

// Mock cellar service
jest.mock('../../src/api/cellarService', () => ({
  cellarService: {
    getCellarById: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: '1',
        name: 'Wine Fridge',
        user_id: 'user123',
        sections: ['Top Shelf', 'Middle Shelf', 'Bottom Shelf'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      })
    ),
    getBottlesByCellarId: jest.fn().mockImplementation(() =>
      Promise.resolve({
        items: [
          {
            id: '101',
            cellar_id: '1',
            wine_id: '201',
            section: 'Top Shelf',
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
          },
          {
            id: '102',
            cellar_id: '1',
            wine_id: '202',
            section: 'Middle Shelf',
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
        total: 2
      })
    ),
    removeBottle: jest.fn().mockImplementation(() => Promise.resolve({ success: true })),
    updateBottle: jest.fn().mockImplementation(() => Promise.resolve({ success: true })),
  }
}));

// Mock useAuth hook
jest.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user123' },
  }),
}));

describe('CellarDetailScreen Component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    jest.clearAllMocks();
  });

  test('renders cellar details correctly', async () => {
    const { findByText } = render(<CellarDetailScreen />);

    // Check that cellar name is displayed
    const cellarName = await findByText('Wine Fridge');
    expect(cellarName).toBeTruthy();

    // Check that section tabs are displayed
    const allTab = await findByText('All');
    const topShelfTab = await findByText('Top Shelf');
    const middleShelfTab = await findByText('Middle Shelf');
    const bottomShelfTab = await findByText('Bottom Shelf');

    expect(allTab).toBeTruthy();
    expect(topShelfTab).toBeTruthy();
    expect(middleShelfTab).toBeTruthy();
    expect(bottomShelfTab).toBeTruthy();
  });

  test('renders bottle list correctly', async () => {
    const { findByText } = render(<CellarDetailScreen />);

    // Check that bottles are displayed
    const bottle1 = await findByText('Opus One 2018');
    const bottle2 = await findByText('Stag\'s Leap Artemis 2019');

    expect(bottle1).toBeTruthy();
    expect(bottle2).toBeTruthy();

    // Check bottle details
    const quantity1 = await findByText('Quantity: 2');
    const price1 = await findByText('$89.99');

    expect(quantity1).toBeTruthy();
    expect(price1).toBeTruthy();
  });

  test('shows loading state initially', () => {
    // Mock getCellarById to return a pending promise (loading state)
    require('../../src/api/cellarService').cellarService.getCellarById.mockImplementationOnce(() =>
      new Promise(() => {}) // Never resolves
    );

    const { getByTestId } = render(<CellarDetailScreen />);

    // Check loading indicator is displayed
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  test('displays error message when cellar fetching fails', async () => {
    // Mock getCellarById to reject
    require('../../src/api/cellarService').cellarService.getCellarById.mockImplementationOnce(() =>
      Promise.reject(new Error('Failed to fetch cellar details'))
    );

    const { findByText } = render(<CellarDetailScreen />);

    // Check error message is displayed
    const errorMessage = await findByText(/Failed to load cellar details/);
    expect(errorMessage).toBeTruthy();
  });

  test('navigates back when back button is pressed', async () => {
    const { findByTestId } = render(<CellarDetailScreen />);

    // Find and press the back button
    const backButton = await findByTestId('back-button');
    fireEvent.press(backButton);

    // Check if goBack was called
    expect(mockGoBack).toHaveBeenCalled();
  });

  test('navigates to edit cellar when edit button is pressed', async () => {
    const { findByTestId } = render(<CellarDetailScreen />);

    // Find and press the edit button
    const editButton = await findByTestId('edit-cellar-button');
    fireEvent.press(editButton);

    // Check if navigation was called with correct parameters
    expect(mockNavigate).toHaveBeenCalledWith('CellarForm', { cellarId: '1' });
  });

  test('filters bottles when section tab is pressed', async () => {
    const { findByText, queryByText } = render(<CellarDetailScreen />);

    // Wait for bottles to load
    await findByText('Opus One 2018');
    await findByText('Stag\'s Leap Artemis 2019');

    // Press the Top Shelf tab
    const topShelfTab = await findByText('Top Shelf');
    fireEvent.press(topShelfTab);

    // Check that only bottles from Top Shelf are displayed
    await findByText('Opus One 2018');

    // Middle Shelf bottle should not be visible
    await waitFor(() => {
      expect(queryByText('Stag\'s Leap Artemis 2019')).toBeNull();
    });
  });

  test('navigates to wine detail when bottle is pressed', async () => {
    const { findByText } = render(<CellarDetailScreen />);

    // Find and press a bottle
    const bottle = await findByText('Opus One 2018');
    fireEvent.press(bottle);

    // Check if navigation was called with correct parameters
    expect(mockNavigate).toHaveBeenCalledWith('WineDetail', { wineId: '201' });
  });

  test('opens bottle options menu when options button is pressed', async () => {
    const { findAllByTestId, findByText } = render(<CellarDetailScreen />);

    // Find and press the first bottle's options button
    const optionsButtons = await findAllByTestId('bottle-options-button');
    fireEvent.press(optionsButtons[0]);

    // Check that options menu is displayed
    const editOption = await findByText('Edit Bottle');
    const removeOption = await findByText('Remove Bottle');

    expect(editOption).toBeTruthy();
    expect(removeOption).toBeTruthy();
  });

  test('removes bottle when remove option is selected', async () => {
    const removeBottleMock = require('../../src/api/cellarService').cellarService.removeBottle;

    const { findAllByTestId, findByText } = render(<CellarDetailScreen />);

    // Open options menu
    const optionsButtons = await findAllByTestId('bottle-options-button');
    fireEvent.press(optionsButtons[0]);

    // Press remove option
    const removeOption = await findByText('Remove Bottle');
    fireEvent.press(removeOption);

    // Confirm removal
    const confirmButton = await findByText('Remove');
    fireEvent.press(confirmButton);

    // Check if removeBottle was called with correct parameters
    await waitFor(() => {
      expect(removeBottleMock).toHaveBeenCalledWith('101');
    });
  });

  test('opens edit bottle modal when edit option is selected', async () => {
    const { findAllByTestId, findByText } = render(<CellarDetailScreen />);

    // Open options menu
    const optionsButtons = await findAllByTestId('bottle-options-button');
    fireEvent.press(optionsButtons[0]);

    // Press edit option
    const editOption = await findByText('Edit Bottle');
    fireEvent.press(editOption);

    // Check if edit modal is displayed
    const modalTitle = await findByText('Edit Bottle');
    expect(modalTitle).toBeTruthy();
  });

  test('updates bottle when edit form is submitted', async () => {
    const updateBottleMock = require('../../src/api/cellarService').cellarService.updateBottle;

    const { findAllByTestId, findByText, findByDisplayValue, findByTestId } = render(<CellarDetailScreen />);

    // Open edit modal
    const optionsButtons = await findAllByTestId('bottle-options-button');
    fireEvent.press(optionsButtons[0]);
    const editOption = await findByText('Edit Bottle');
    fireEvent.press(editOption);

    // Update quantity
    const quantityInput = await findByDisplayValue('2');
    fireEvent.changeText(quantityInput, '3');

    // Submit form
    const saveButton = await findByTestId('save-bottle-button');
    fireEvent.press(saveButton);

    // Check if updateBottle was called with correct parameters
    await waitFor(() => {
      expect(updateBottleMock).toHaveBeenCalledWith('101', expect.objectContaining({
        quantity: 3
      }));
    });
  });

  test('navigates to add bottle screen when add button is pressed', async () => {
    const { findByTestId } = render(<CellarDetailScreen />);

    // Find and press the add bottle button
    const addButton = await findByTestId('add-bottle-button');
    fireEvent.press(addButton);

    // Check if navigation was called with correct parameters
    expect(mockNavigate).toHaveBeenCalledWith('WineSearch', {
      onWineSelect: expect.any(Function),
      source: 'cellar',
      cellarId: '1'
    });
  });
});
