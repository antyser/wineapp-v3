import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../src/screens/LoginScreen';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock auth context
const mockLogin = jest.fn();
const mockIsAuthenticated = jest.fn().mockReturnValue(false);
jest.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: mockIsAuthenticated(),
  }),
}));

describe('LoginScreen Component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    mockNavigate.mockClear();
    mockLogin.mockClear();
    mockIsAuthenticated.mockReturnValue(false);
  });

  test('renders login form correctly', () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    // Check that title and form elements are displayed
    expect(getByText('Wine App')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText('Don\'t have an account? Sign Up')).toBeTruthy();
  });

  test('calls login function with credentials when form is submitted', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    // Fill in the form
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    // Submit the form
    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    // Check if login was called with correct credentials
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('displays error message when login fails', async () => {
    // Mock login to reject
    mockLogin.mockImplementationOnce(() =>
      Promise.reject(new Error('Invalid email or password'))
    );

    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);

    // Fill in the form
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');

    // Submit the form
    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    // Check if error message is displayed
    const errorMessage = await findByText('Invalid email or password');
    expect(errorMessage).toBeTruthy();
  });

  test('navigates to home screen when login is successful', async () => {
    // Mock login to resolve
    mockLogin.mockImplementationOnce(() => Promise.resolve());

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    // Fill in the form
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    // Submit the form
    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    // Check if navigation was called to home screen
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Main');
    });
  });

  test('navigates to signup screen when signup link is pressed', () => {
    const { getByText } = render(<LoginScreen />);

    // Press signup link
    const signUpLink = getByText('Don\'t have an account? Sign Up');
    fireEvent.press(signUpLink);

    // Check if navigation was called to signup screen
    expect(mockNavigate).toHaveBeenCalledWith('Signup');
  });

  test('redirects to home if already authenticated', () => {
    // Mock auth to return authenticated
    mockIsAuthenticated.mockReturnValueOnce(true);

    render(<LoginScreen />);

    // Check if navigation was called to home screen
    expect(mockNavigate).toHaveBeenCalledWith('Main');
  });

  test('shows loading indicator during login process', async () => {
    // Mock login to delay resolution
    mockLogin.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    );

    const { getByPlaceholderText, getByText, getByTestId } = render(<LoginScreen />);

    // Fill in the form
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    // Submit the form
    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    // Check if loading indicator is displayed
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  test('validates email format', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);

    // Fill in the form with invalid email
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.changeText(passwordInput, 'password123');

    // Submit the form
    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    // Check if validation error is displayed
    const validationError = await findByText('Please enter a valid email address');
    expect(validationError).toBeTruthy();

    // Login should not be called
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('validates password length', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);

    // Fill in the form with short password
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'short');

    // Submit the form
    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    // Check if validation error is displayed
    const validationError = await findByText('Password must be at least 8 characters');
    expect(validationError).toBeTruthy();

    // Login should not be called
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
