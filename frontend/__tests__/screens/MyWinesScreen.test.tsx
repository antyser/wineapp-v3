import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MyWinesScreen from '../../src/screens/MyWinesScreen';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock the cellar service
jest.mock('../../src/api/cellarService', () => ({
  cellarService: {
    getCellars: jest.fn().mockImplementation(() =>
      Promise.resolve({
        items: [
          {
            id: '1',
            user_id: 'user123',
            name: 'My Wine Collection',
            sections: ['Main Rack', 'Wine Fridge'],
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
          {
            id: '2',
            user_id: 'user123',
            name: 'Vacation Home',
            sections: ['Kitchen'],
            created_at: '2023-01-02T00:00:00Z',
            updated_at: '2023-01-02T00:00:00Z',
          }
        ],
        total: 2
      })
    ),
    getCellarStatistics: jest.fn().mockImplementation(() =>
      Promise.resolve({
        total_bottles: 42,
        total_value: 3500.50,
        bottles_by_type: { 'Red': 30, 'White': 12 },
        bottles_by_region: { 'Bordeaux': 15, 'Burgundy': 10, 'Napa': 17 },
        bottles_by_vintage: { '2018': 20, '2019': 15, '2020': 7 }
      })
    )
  }
}));

// Mock useAuth hook
jest.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user123' },
  }),
}));

describe('MyWinesScreen Component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    mockNavigate.mockClear();
    jest.clearAllMocks();
  });

  test('renders with tabs and cellar list', async () => {
    const { getByText, findByText } = render(<MyWinesScreen />);

    // Check tabs are rendered
    expect(getByText('Cellars')).toBeTruthy();
    expect(getByText('Wishlist')).toBeTruthy();
    expect(getByText('Notes')).toBeTruthy();

    // Check cellars load
    const cellar1 = await findByText('My Wine Collection');
    const cellar2 = await findByText('Vacation Home');

    expect(cellar1).toBeTruthy();
    expect(cellar2).toBeTruthy();
  });

  test('navigates to cellar detail when a cellar is pressed', async () => {
    const { findByText } = render(<MyWinesScreen />);

    // Find a cellar and press it
    const cellar = await findByText('My Wine Collection');
    fireEvent.press(cellar);

    // Check if navigation was called with correct cellar ID
    expect(mockNavigate).toHaveBeenCalledWith('CellarDetail', { cellarId: '1' });
  });

  test('navigates to cellar form when add cellar button is pressed', async () => {
    const { getByTestId } = render(<MyWinesScreen />);

    // Find and press the add cellar button
    const addButton = await getByTestId('add-cellar-button');
    fireEvent.press(addButton);

    // Check if navigation was called to the cellar form
    expect(mockNavigate).toHaveBeenCalledWith('CellarForm', {});
  });

  test('navigates to cellar stats when view statistics is pressed', async () => {
    const { getByText } = render(<MyWinesScreen />);

    // Find and press the view statistics button
    const statsButton = getByText('View Statistics');
    fireEvent.press(statsButton);

    // Check if navigation was called to the cellar stats screen
    expect(mockNavigate).toHaveBeenCalledWith('CellarStats', {});
  });

  test('displays loading state while fetching cellars', () => {
    // Mock getCellars to return a pending promise (loading state)
    require('../../src/api/cellarService').cellarService.getCellars.mockImplementationOnce(() =>
      new Promise(() => {}) // Never resolves
    );

    const { getByTestId } = render(<MyWinesScreen />);

    // Check loading indicator is displayed
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  test('displays error state when fetching cellars fails', async () => {
    // Mock getCellars to reject
    require('../../src/api/cellarService').cellarService.getCellars.mockImplementationOnce(() =>
      Promise.reject(new Error('Failed to fetch cellars'))
    );

    const { findByText } = render(<MyWinesScreen />);

    // Check error message is displayed
    const errorMessage = await findByText(/Failed to load/);
    expect(errorMessage).toBeTruthy();
  });

  test('switches between tabs when tabs are pressed', async () => {
    const { getByText, findByText } = render(<MyWinesScreen />);

    // Initially on Cellars tab, check My Wine Collection is visible
    await findByText('My Wine Collection');

    // Switch to Wishlist tab
    fireEvent.press(getByText('Wishlist'));

    // Check wishlist content is visible
    expect(getByText('Your wishlist is empty')).toBeTruthy();

    // Switch to Notes tab
    fireEvent.press(getByText('Notes'));

    // Check notes content is visible
    expect(getByText('You have no tasting notes')).toBeTruthy();
  });
});
