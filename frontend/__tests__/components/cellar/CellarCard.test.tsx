import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CellarCard from '../../../src/components/cellar/CellarCard';

// Mock cellar data for tests
const mockCellar = {
  id: '1',
  user_id: 'user123',
  name: 'My Test Cellar',
  sections: ['Main Rack', 'Wine Fridge'],
  image_url: 'https://example.com/cellar.jpg',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

describe('CellarCard Component', () => {
  test('renders correctly with all cellar data', () => {
    const onPressMock = jest.fn();

    const { getByText } = render(
      <CellarCard
        cellar={mockCellar}
        bottleCount={42}
        onPress={onPressMock}
      />
    );

    // Check if cellar details are displayed
    expect(getByText(mockCellar.name)).toBeTruthy();
    expect(getByText('42 bottles')).toBeTruthy();
    expect(getByText('2 sections')).toBeTruthy();
  });

  test('renders correctly with single bottle and section', () => {
    const onPressMock = jest.fn();
    const singleSectionCellar = {
      ...mockCellar,
      sections: ['Main Rack'],
    };

    const { getByText } = render(
      <CellarCard
        cellar={singleSectionCellar}
        bottleCount={1}
        onPress={onPressMock}
      />
    );

    // Check if cellar details are displayed with correct singular forms
    expect(getByText('1 bottle')).toBeTruthy();
    expect(getByText('1 section')).toBeTruthy();
  });

  test('renders without sections if none provided', () => {
    const onPressMock = jest.fn();
    const noSectionsCellar = {
      ...mockCellar,
      sections: undefined,
    };

    const { getByText, queryByText } = render(
      <CellarCard
        cellar={noSectionsCellar}
        bottleCount={10}
        onPress={onPressMock}
      />
    );

    // Should not show sections text
    expect(getByText(mockCellar.name)).toBeTruthy();
    expect(getByText('10 bottles')).toBeTruthy();
    expect(queryByText('sections')).toBeNull();
  });

  test('calls onPress callback when card is pressed', () => {
    const onPressMock = jest.fn();

    const { getByText } = render(
      <CellarCard
        cellar={mockCellar}
        onPress={onPressMock}
      />
    );

    // Press the card
    fireEvent.press(getByText(mockCellar.name));

    // Check if callback was called with correct cellar
    expect(onPressMock).toHaveBeenCalledTimes(1);
    expect(onPressMock).toHaveBeenCalledWith(mockCellar);
  });

  test('renders edit and delete buttons when callbacks provided', () => {
    const onPressMock = jest.fn();
    const onEditMock = jest.fn();
    const onDeleteMock = jest.fn();

    const { getByTestId } = render(
      <CellarCard
        cellar={mockCellar}
        onPress={onPressMock}
        onEdit={onEditMock}
        onDelete={onDeleteMock}
      />
    );

    // Check if edit and delete buttons are rendered
    const editButton = getByTestId('edit-button');
    const deleteButton = getByTestId('delete-button');

    // Press the buttons
    fireEvent.press(editButton);
    fireEvent.press(deleteButton);

    // Check if callbacks were called with correct cellar
    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onEditMock).toHaveBeenCalledWith(mockCellar);
    expect(onDeleteMock).toHaveBeenCalledTimes(1);
    expect(onDeleteMock).toHaveBeenCalledWith(mockCellar);
  });

  test('does not render edit and delete buttons when callbacks not provided', () => {
    const onPressMock = jest.fn();

    const { queryByTestId } = render(
      <CellarCard
        cellar={mockCellar}
        onPress={onPressMock}
        // No edit or delete callbacks
      />
    );

    // Check that buttons are not rendered
    expect(queryByTestId('edit-button')).toBeNull();
    expect(queryByTestId('delete-button')).toBeNull();
  });
});
