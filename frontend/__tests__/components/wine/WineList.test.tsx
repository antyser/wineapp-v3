import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WineList from '../../../src/components/wine/WineList';

// Mock wine data for tests
const mockWines = [
  {
    id: '1',
    name: 'Chateau Margaux',
    vintage: '2015',
    region: 'Bordeaux',
    country: 'France',
    producer: 'Chateau Margaux',
    wine_type: 'Red',
    average_price: 899.99,
  },
  {
    id: '2',
    name: 'Opus One',
    vintage: '2018',
    region: 'Napa Valley',
    country: 'USA',
    producer: 'Opus One Winery',
    wine_type: 'Red',
    average_price: 399.99,
  },
  {
    id: '3',
    name: 'Dom Pérignon',
    vintage: '2010',
    region: 'Champagne',
    country: 'France',
    producer: 'Moët & Chandon',
    wine_type: 'Sparkling',
    average_price: 249.99,
  }
];

describe('WineList Component', () => {
  test('renders a list of wines', () => {
    const onWinePressMock = jest.fn();

    const { getAllByText } = render(
      <WineList
        wines={mockWines}
        onWinePress={onWinePressMock}
      />
    );

    // Check if all wines are rendered
    expect(getAllByText('Chateau Margaux')[0]).toBeTruthy();
    expect(getAllByText('2015')[0]).toBeTruthy();
    expect(getAllByText('Bordeaux')[0]).toBeTruthy();
    expect(getAllByText('Opus One')[0]).toBeTruthy();
    expect(getAllByText('Dom Pérignon')[0]).toBeTruthy();
  });

  test('calls onWinePress when a wine is pressed', () => {
    const onWinePressMock = jest.fn();

    const { getAllByText } = render(
      <WineList
        wines={mockWines}
        onWinePress={onWinePressMock}
      />
    );

    // Press the first wine
    fireEvent.press(getAllByText('Chateau Margaux')[0]);

    // Check if callback was called with correct wine
    expect(onWinePressMock).toHaveBeenCalledTimes(1);
    expect(onWinePressMock).toHaveBeenCalledWith(mockWines[0]);
  });

  test('renders loading indicator when loading and no wines', () => {
    const onWinePressMock = jest.fn();

    const { getByTestId } = render(
      <WineList
        wines={[]}
        loading={true}
        onWinePress={onWinePressMock}
      />
    );

    // Check if loading indicator is rendered
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  test('renders error message when there is an error and no wines', () => {
    const onWinePressMock = jest.fn();
    const errorMessage = 'Failed to load wines';

    const { getByText } = render(
      <WineList
        wines={[]}
        error={errorMessage}
        onWinePress={onWinePressMock}
      />
    );

    // Check if error message is rendered
    expect(getByText(errorMessage)).toBeTruthy();
  });

  test('renders empty message when no wines', () => {
    const onWinePressMock = jest.fn();

    const { getByText } = render(
      <WineList
        wines={[]}
        onWinePress={onWinePressMock}
      />
    );

    // Check if empty message is rendered
    expect(getByText('No wines found')).toBeTruthy();
  });

  test('renders loading indicator at bottom when hasMore and loading', () => {
    const onWinePressMock = jest.fn();

    const { getByTestId } = render(
      <WineList
        wines={mockWines}
        loading={true}
        hasMore={true}
        onWinePress={onWinePressMock}
      />
    );

    // Check if loading more indicator is rendered
    expect(getByTestId('loading-more-indicator')).toBeTruthy();
  });

  test('calls onEndReached when scrolling to the end', () => {
    const onWinePressMock = jest.fn();
    const onEndReachedMock = jest.fn();

    const { getByTestId } = render(
      <WineList
        wines={mockWines}
        onWinePress={onWinePressMock}
        onEndReached={onEndReachedMock}
      />
    );

    // Simulate reaching the end of the list
    const flatList = getByTestId('wine-flat-list');
    fireEvent(flatList, 'onEndReached');

    // Check if callback was called
    expect(onEndReachedMock).toHaveBeenCalledTimes(1);
  });
});
