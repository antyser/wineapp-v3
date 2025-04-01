import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CellarList from '../../../src/components/cellar/CellarList';

// Mock cellar data for tests
const mockCellars = [
  {
    id: '1',
    user_id: 'user123',
    name: 'My Home Collection',
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
];

// Mock bottle counts
const mockBottleCounts = {
  '1': 42,
  '2': 15
};

describe('CellarList Component', () => {
  test('renders a list of cellars with bottle counts', () => {
    const onCellarPressMock = jest.fn();

    const { getByText } = render(
      <CellarList
        cellars={mockCellars}
        cellarBottleCounts={mockBottleCounts}
        onCellarPress={onCellarPressMock}
      />
    );

    // Check if all cellars are rendered with their bottle counts
    expect(getByText('My Home Collection')).toBeTruthy();
    expect(getByText('42 bottles')).toBeTruthy();
    expect(getByText('Vacation Home')).toBeTruthy();
    expect(getByText('15 bottles')).toBeTruthy();
  });

  test('renders loading indicator when loading and no cellars', () => {
    const onCellarPressMock = jest.fn();

    const { getByTestId } = render(
      <CellarList
        cellars={[]}
        loading={true}
        onCellarPress={onCellarPressMock}
      />
    );

    // Check if loading indicator is rendered
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  test('renders error message when there is an error and no cellars', () => {
    const onCellarPressMock = jest.fn();
    const errorMessage = 'Failed to load cellars';

    const { getByText } = render(
      <CellarList
        cellars={[]}
        error={errorMessage}
        onCellarPress={onCellarPressMock}
      />
    );

    // Check if error message is rendered
    expect(getByText(errorMessage)).toBeTruthy();
  });

  test('renders empty message when no cellars', () => {
    const onCellarPressMock = jest.fn();

    const { getByTestId, getByText } = render(
      <CellarList
        cellars={[]}
        onCellarPress={onCellarPressMock}
      />
    );

    // Check if empty message is rendered
    const emptyMessage = getByTestId('empty-message');
    expect(emptyMessage).toBeTruthy();
    expect(getByText('No cellars found')).toBeTruthy();
    expect(getByText('Create your first cellar to get started')).toBeTruthy();
  });

  test('renders FAB button when onAddCellar is provided', () => {
    const onCellarPressMock = jest.fn();
    const onAddCellarMock = jest.fn();

    const { getByTestId } = render(
      <CellarList
        cellars={mockCellars}
        onCellarPress={onCellarPressMock}
        onAddCellar={onAddCellarMock}
      />
    );

    // Check if FAB button is rendered
    const fabButton = getByTestId('add-cellar-button');
    expect(fabButton).toBeTruthy();

    // Press the button
    fireEvent.press(fabButton);

    // Check if callback was called
    expect(onAddCellarMock).toHaveBeenCalledTimes(1);
  });

  test('does not render FAB button when onAddCellar is not provided', () => {
    const onCellarPressMock = jest.fn();

    const { queryByTestId } = render(
      <CellarList
        cellars={mockCellars}
        onCellarPress={onCellarPressMock}
        // No onAddCellar prop
      />
    );

    // Check that FAB button is not rendered
    expect(queryByTestId('add-cellar-button')).toBeNull();
  });

  test('calls onCellarPress when a cellar is pressed', () => {
    const onCellarPressMock = jest.fn();

    const { getByText } = render(
      <CellarList
        cellars={mockCellars}
        onCellarPress={onCellarPressMock}
      />
    );

    // Press the first cellar
    fireEvent.press(getByText('My Home Collection'));

    // Check if callback was called with correct cellar
    expect(onCellarPressMock).toHaveBeenCalledTimes(1);
    expect(onCellarPressMock).toHaveBeenCalledWith(mockCellars[0]);
  });

  test('shows edit and delete buttons when callbacks provided', () => {
    const onCellarPressMock = jest.fn();
    const onEditCellarMock = jest.fn();
    const onDeleteCellarMock = jest.fn();

    const { getAllByTestId } = render(
      <CellarList
        cellars={mockCellars}
        onCellarPress={onCellarPressMock}
        onEditCellar={onEditCellarMock}
        onDeleteCellar={onDeleteCellarMock}
      />
    );

    // Check if edit buttons are rendered for each cellar
    const editButtons = getAllByTestId('edit-button');
    expect(editButtons.length).toBe(2);

    // Check if delete buttons are rendered for each cellar
    const deleteButtons = getAllByTestId('delete-button');
    expect(deleteButtons.length).toBe(2);

    // Press one of each
    fireEvent.press(editButtons[0]);
    fireEvent.press(deleteButtons[1]);

    // Check if callbacks were called with correct cellars
    expect(onEditCellarMock).toHaveBeenCalledWith(mockCellars[0]);
    expect(onDeleteCellarMock).toHaveBeenCalledWith(mockCellars[1]);
  });
});
