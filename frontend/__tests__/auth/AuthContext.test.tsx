import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { AuthProvider, useAuth } from '../../src/auth/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock auth service
jest.mock('../../src/api/authService', () => ({
  authService: {
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    validateToken: jest.fn(),
  }
}));

describe('AuthContext', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  test('provides initial auth state', () => {
    // Mock getItem to return null (no stored token)
    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initial state should be unauthenticated
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(true); // Initially loading while checking storage
  });

  test('loading completes after initializing', async () => {
    // Mock getItem to return null (no stored token)
    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });

    // Wait for initialization to complete
    await waitForNextUpdate();

    // Loading should be false after initialization
    expect(result.current.isLoading).toBe(false);
  });

  test('login sets authenticated state and stores token', async () => {
    // Mock successful login response
    const mockUser = { id: 'user123', name: 'Test User', email: 'test@example.com' };
    const mockToken = 'mock-token';
    require('../../src/api/authService').authService.login.mockResolvedValueOnce({
      user: mockUser,
      token: mockToken
    });

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });

    // Wait for initialization to complete
    await waitForNextUpdate();

    // Call login
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    // Auth state should be updated
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);

    // Token should be stored
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
  });

  test('login handles authentication errors', async () => {
    // Mock failed login response
    const mockError = new Error('Invalid credentials');
    require('../../src/api/authService').authService.login.mockRejectedValueOnce(mockError);

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });

    // Wait for initialization to complete
    await waitForNextUpdate();

    // Call login and expect it to throw
    await expect(
      act(async () => {
        await result.current.login('test@example.com', 'wrong-password');
      })
    ).rejects.toThrow('Invalid credentials');

    // Auth state should remain unauthenticated
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  test('signup creates user and sets authenticated state', async () => {
    // Mock successful signup response
    const mockUser = { id: 'user123', name: 'New User', email: 'new@example.com' };
    const mockToken = 'mock-token';
    require('../../src/api/authService').authService.signup.mockResolvedValueOnce({
      user: mockUser,
      token: mockToken
    });

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });

    // Wait for initialization to complete
    await waitForNextUpdate();

    // Call signup
    await act(async () => {
      await result.current.signup({
        name: 'New User',
        email: 'new@example.com',
        password: 'password123'
      });
    });

    // Auth state should be updated
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);

    // Token should be stored
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
  });

  test('signup handles registration errors', async () => {
    // Mock failed signup response
    const mockError = new Error('Email already in use');
    require('../../src/api/authService').authService.signup.mockRejectedValueOnce(mockError);

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });

    // Wait for initialization to complete
    await waitForNextUpdate();

    // Call signup and expect it to throw
    await expect(
      act(async () => {
        await result.current.signup({
          name: 'New User',
          email: 'existing@example.com',
          password: 'password123'
        });
      })
    ).rejects.toThrow('Email already in use');

    // Auth state should remain unauthenticated
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  test('logout clears auth state and removes token', async () => {
    // First, mock login to set authenticated state
    const mockUser = { id: 'user123', name: 'Test User', email: 'test@example.com' };
    const mockToken = 'mock-token';
    require('../../src/api/authService').authService.login.mockResolvedValueOnce({
      user: mockUser,
      token: mockToken
    });

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });

    // Wait for initialization to complete
    await waitForNextUpdate();

    // Log in
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    // Confirm logged in
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);

    // Now logout
    await act(async () => {
      await result.current.logout();
    });

    // Auth state should be cleared
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();

    // Token should be removed
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
  });

  test('restores auth state from token on initialization', async () => {
    // Mock stored token
    const mockToken = 'mock-stored-token';
    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(mockToken));

    // Mock successful token validation
    const mockUser = { id: 'user123', name: 'Test User', email: 'test@example.com' };
    require('../../src/api/authService').authService.validateToken.mockResolvedValueOnce({
      valid: true,
      user: mockUser
    });

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });

    // Wait for initialization to complete
    await waitForNextUpdate();

    // Auth state should be restored
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
  });

  test('clears invalid token on initialization', async () => {
    // Mock stored token
    const mockToken = 'mock-invalid-token';
    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(mockToken));

    // Mock failed token validation
    require('../../src/api/authService').authService.validateToken.mockResolvedValueOnce({
      valid: false
    });

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });

    // Wait for initialization to complete
    await waitForNextUpdate();

    // Auth state should not be authenticated
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);

    // Invalid token should be removed
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
  });

  test('refresh token updates stored token', async () => {
    // First, mock login to set authenticated state
    const mockUser = { id: 'user123', name: 'Test User', email: 'test@example.com' };
    const mockToken = 'mock-token';
    require('../../src/api/authService').authService.login.mockResolvedValueOnce({
      user: mockUser,
      token: mockToken
    });

    const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });

    // Wait for initialization to complete
    await waitForNextUpdate();

    // Log in
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    // Mock refresh token response
    const newToken = 'new-mock-token';
    require('../../src/api/authService').authService.refreshToken.mockResolvedValueOnce({
      token: newToken
    });

    // Refresh token
    await act(async () => {
      await result.current.refreshToken();
    });

    // New token should be stored
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', newToken);
  });
});
