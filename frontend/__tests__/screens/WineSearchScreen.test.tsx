import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WineSearchScreen from '../../src/screens/WineSearchScreen';

// Mock navigation and route
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRoute = {
  params: {}
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack
  }),
}));

// Mock the wine service
jest.mock('../../src/api/wineService', () => ({
  wineService: {
    searchWines: jest.fn().mockImplementation(() =>
      Promise.resolve({
        items: [
          {
            id: '1',
            name: 'Test Wine 1',
            vintage: '2018',
            region: 'Test Region',
            wine_type: 'Red',
            producer: 'Test Producer'
          },
          {
            id: '2',
            name: 'Test Wine 2',
            vintage: '2019',
            region: 'Another Region',
            wine_type: 'White',
            producer: 'Another Producer'
          }
        ],
        total: 2
      })
    )
  }
}));

describe('WineSearchScreen Component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    jest.clearAllMocks();
  });

  test('renders with search bar and empty state initially', async () => {
    const { getByPlaceholderText, getByText } = render(
      <WineSearchScreen route={mockRoute} />
    );

    // Check search bar exists
    expect(getByPlaceholderText('Search for wines...')).toBeTruthy();

    // Check empty state message
    expect(getByText('Search for wines by name, variety, or region')).toBeTruthy();
  });

  test('performs search when user submits query', async () => {
    const { getByPlaceholderText, findByText } = render(
      <WineSearchScreen route={mockRoute} />
    );

    // Find search input and enter text
    const searchInput = getByPlaceholderText('Search for wines...');
    fireEvent.changeText(searchInput, 'cabernet');

    // Submit the search
    fireEvent(searchInput, 'submitEditing');

    // Check that the results are displayed after the search
    const result = await findByText('Test Wine 1');
    expect(result).toBeTruthy();
  });

  test('navigates to wine detail when a wine is selected', async () => {
    const { getByPlaceholderText, findByText } = render(
      <WineSearchScreen route={mockRoute} />
    );

    // Perform search
    const searchInput = getByPlaceholderText('Search for wines...');
    fireEvent.changeText(searchInput, 'cabernet');
    fireEvent(searchInput, 'submitEditing');

    // Find a result and press it
    const wineResult = await findByText('Test Wine 1');
    fireEvent.press(wineResult);

    // Check if navigation was called with correct wine ID
    expect(mockNavigate).toHaveBeenCalledWith('WineDetail', { wineId: '1' });
  });

  test('shows initial query from route params', async () => {
    // Create route with initial query
    const routeWithQuery = {
      params: {
        initialQuery: 'merlot'
      }
    };

    const { getByDisplayValue, findByText } = render(
      <WineSearchScreen route={routeWithQuery} />
    );

    // Check that search input contains initial query
    expect(getByDisplayValue('merlot')).toBeTruthy();

    // Should have triggered a search automatically
    const result = await findByText('Test Wine 1');
    expect(result).toBeTruthy();
  });

  test('shows loading state during search', async () => {
    // Mock the wine service to delay the response
    require('../../src/api/wineService').wineService.searchWines.mockImplementationOnce(() =>
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            items: [
              {
                id: '1',
                name: 'Test Wine 1',
                vintage: '2018',
                region: 'Test Region',
                wine_type: 'Red',
                producer: 'Test Producer'
              }
            ],
            total: 1
          });
        }, 100);
      })
    );

    const { getByPlaceholderText, getByTestId, findByText } = render(
      <WineSearchScreen route={mockRoute} />
    );

    // Perform search
    const searchInput = getByPlaceholderText('Search for wines...');
    fireEvent.changeText(searchInput, 'cabernet');
    fireEvent(searchInput, 'submitEditing');

    // Check for loading indicator
    expect(getByTestId('loading-indicator')).toBeTruthy();

    // Wait for results
    const result = await findByText('Test Wine 1');
    expect(result).toBeTruthy();
  });

  test('handles search error state', async () => {
    // Mock the wine service to throw an error
    require('../../src/api/wineService').wineService.searchWines.mockImplementationOnce(() =>
      Promise.reject(new Error('Network error'))
    );

    const { getByPlaceholderText, findByText } = render(
      <WineSearchScreen route={mockRoute} />
    );

    // Perform search
    const searchInput = getByPlaceholderText('Search for wines...');
    fireEvent.changeText(searchInput, 'error');
    fireEvent(searchInput, 'submitEditing');

    // Check for error message
    const errorMessage = await findByText(/Failed to load wines/);
    expect(errorMessage).toBeTruthy();
  });
});
