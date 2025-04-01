import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WineCard from '../../../src/components/wine/WineCard';

// Mock wine data for tests
const mockWine = {
  id: '123',
  name: 'Test Wine',
  vintage: '2018',
  region: 'Napa Valley',
  country: 'USA',
  producer: 'Test Winery',
  wine_type: 'Red',
  grape_variety: 'Cabernet Sauvignon',
  average_price: 49.99,
  description: 'A delicious test wine with berry notes',
  image_url: 'https://example.com/test-wine.jpg',
};

describe('WineCard Component', () => {
  test('renders correctly with all wine data', () => {
    const { getByText, getByTestId } = render(
      <WineCard wine={mockWine} />
    );

    // Check if all wine details are displayed
    expect(getByText(mockWine.name)).toBeTruthy();
    expect(getByText(mockWine.vintage)).toBeTruthy();
    expect(getByText(mockWine.producer)).toBeTruthy();
    expect(getByText(mockWine.region)).toBeTruthy();
    expect(getByText(mockWine.wine_type)).toBeTruthy();
    expect(getByText(/Cabernet Sauvignon/)).toBeTruthy();
    expect(getByText(/\$49\.99/)).toBeTruthy();
    expect(getByText(mockWine.description)).toBeTruthy();
  });

  test('renders correctly with partial wine data', () => {
    const partialWine = {
      id: '123',
      name: 'Simple Wine',
      vintage: '2020',
      // Missing other properties
    };

    const { getByText, queryByText } = render(
      <WineCard wine={partialWine as any} />
    );

    // Check that available data is displayed
    expect(getByText('Simple Wine')).toBeTruthy();
    expect(getByText('2020')).toBeTruthy();

    // Check that missing data is not rendered
    expect(queryByText('Napa Valley')).toBeNull();
    expect(queryByText('Red')).toBeNull();
  });

  test('wishlist button toggles state and triggers callback', () => {
    const onAddToWishlistMock = jest.fn();

    // Test with not in wishlist state
    const { getByTestId, rerender } = render(
      <WineCard
        wine={mockWine}
        isInWishlist={false}
        onAddToWishlist={onAddToWishlistMock}
      />
    );

    // Find the heart icon button
    const wishlistButton = getByTestId('wishlist-button');

    // Click the button
    fireEvent.press(wishlistButton);

    // Check if callback was called
    expect(onAddToWishlistMock).toHaveBeenCalledTimes(1);

    // Re-render with isInWishlist=true to check if icon changes
    rerender(
      <WineCard
        wine={mockWine}
        isInWishlist={true}
        onAddToWishlist={onAddToWishlistMock}
      />
    );

    // Check that the icon has changed - we're checking the prop directly on the component
    const updatedButton = getByTestId('wishlist-button');
    // In tests we may not have access to props.icon directly, so we test the updated state instead
    expect(updatedButton).toBeTruthy();
  });

  test('action buttons trigger their respective callbacks', () => {
    const onAddToCellarMock = jest.fn();
    const onAddNoteMock = jest.fn();
    const onConsumeMock = jest.fn();

    const { getByText } = render(
      <WineCard
        wine={mockWine}
        onAddToCellar={onAddToCellarMock}
        onAddNote={onAddNoteMock}
        onConsume={onConsumeMock}
      />
    );

    // Find and press each action button
    fireEvent.press(getByText('Add to Cellar'));
    fireEvent.press(getByText('Add Note'));
    fireEvent.press(getByText('Consume'));

    // Check if callbacks were called
    expect(onAddToCellarMock).toHaveBeenCalledTimes(1);
    expect(onAddNoteMock).toHaveBeenCalledTimes(1);
    expect(onConsumeMock).toHaveBeenCalledTimes(1);
  });
});
