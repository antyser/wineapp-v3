import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignupScreen from '../../src/screens/SignupScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock auth context
const mockSignup = jest.fn();
const mockIsAuthenticated = jest.fn().mockReturnValue(false);
jest.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    signup: mockSignup,
    isAuthenticated: mockIsAuthenticated(),
  }),
}));

describe('SignupScreen Component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSignup.mockClear();
    mockIsAuthenticated.mockReturnValue(false);
  });

  test('renders signup form correctly', () => {
    const { getByText, getByPlaceholderText } = render(<SignupScreen />);

    // Check that title and form elements are displayed
    expect(getByText('Wine App')).toBeTruthy();
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByPlaceholderText('Name')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm Password')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
    expect(getByText('Already have an account? Sign In')).toBeTruthy();
  });

  test('calls signup function with user details when form is submitted', async () => {
    const { getByPlaceholderText, getByText } = render(<SignupScreen />);

    // Fill in the form
    const nameInput = getByPlaceholderText('Name');
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm Password');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    // Submit the form
    const signUpButton = getByText('Sign Up');
    fireEvent.press(signUpButton);

    // Check if signup was called with correct user details
    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  test('displays error message when signup fails', async () => {
    // Mock signup to reject
    mockSignup.mockImplementationOnce(() =>
      Promise.reject(new Error('Email already in use'))
    );

    const { getByPlaceholderText, getByText, findByText } = render(<SignupScreen />);

    // Fill in the form
    const nameInput = getByPlaceholderText('Name');
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm Password');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'existing@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    // Submit the form
    const signUpButton = getByText('Sign Up');
    fireEvent.press(signUpButton);

    // Check if error message is displayed
    const errorMessage = await findByText('Email already in use');
    expect(errorMessage).toBeTruthy();
  });

  test('navigates to home screen when signup is successful', async () => {
    // Mock signup to resolve
    mockSignup.mockImplementationOnce(() => Promise.resolve());

    const { getByPlaceholderText, getByText } = render(<SignupScreen />);

    // Fill in the form
    const nameInput = getByPlaceholderText('Name');
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm Password');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    // Submit the form
    const signUpButton = getByText('Sign Up');
    fireEvent.press(signUpButton);

    // Check if navigation was called to home screen
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Main');
    });
  });

  test('navigates to login screen when signin link is pressed', () => {
    const { getByText } = render(<SignupScreen />);

    // Press signin link
    const signInLink = getByText('Already have an account? Sign In');
    fireEvent.press(signInLink);

    // Check if navigation was called to login screen
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  test('redirects to home if already authenticated', () => {
    // Mock auth to return authenticated
    mockIsAuthenticated.mockReturnValueOnce(true);

    render(<SignupScreen />);

    // Check if navigation was called to home screen
    expect(mockNavigate).toHaveBeenCalledWith('Main');
  });

  test('shows loading indicator during signup process', async () => {
    // Mock signup to delay resolution
    mockSignup.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    );

    const { getByPlaceholderText, getByText, getByTestId } = render(<SignupScreen />);

    // Fill in the form
    const nameInput = getByPlaceholderText('Name');
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm Password');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    // Submit the form
    const signUpButton = getByText('Sign Up');
    fireEvent.press(signUpButton);

    // Check if loading indicator is displayed
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  test('validates email format', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<SignupScreen />);

    // Fill in the form with invalid email
    const nameInput = getByPlaceholderText('Name');
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm Password');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    // Submit the form
    const signUpButton = getByText('Sign Up');
    fireEvent.press(signUpButton);

    // Check if validation error is displayed
    const validationError = await findByText('Please enter a valid email address');
    expect(validationError).toBeTruthy();

    // Signup should not be called
    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('validates password length', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<SignupScreen />);

    // Fill in the form with short password
    const nameInput = getByPlaceholderText('Name');
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm Password');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'short');
    fireEvent.changeText(confirmPasswordInput, 'short');

    // Submit the form
    const signUpButton = getByText('Sign Up');
    fireEvent.press(signUpButton);

    // Check if validation error is displayed
    const validationError = await findByText('Password must be at least 8 characters');
    expect(validationError).toBeTruthy();

    // Signup should not be called
    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('validates password match', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<SignupScreen />);

    // Fill in the form with mismatched passwords
    const nameInput = getByPlaceholderText('Name');
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm Password');

    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password456');

    // Submit the form
    const signUpButton = getByText('Sign Up');
    fireEvent.press(signUpButton);

    // Check if validation error is displayed
    const validationError = await findByText('Passwords do not match');
    expect(validationError).toBeTruthy();

    // Signup should not be called
    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('validates name is not empty', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<SignupScreen />);

    // Fill in the form with empty name
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm Password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');

    // Submit the form
    const signUpButton = getByText('Sign Up');
    fireEvent.press(signUpButton);

    // Check if validation error is displayed
    const validationError = await findByText('Name is required');
    expect(validationError).toBeTruthy();

    // Signup should not be called
    expect(mockSignup).not.toHaveBeenCalled();
  });
});
