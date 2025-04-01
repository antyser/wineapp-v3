import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define user type
export interface User {
  id: string;
  email: string;
  // Add any other user properties here
}

// Auth context type
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  loading: true,
});

// Development mode detection
const isDevelopment = process.env.NODE_ENV === 'development';

// Development user for testing
const DEV_USER: User = {
  id: '443ce2fe-1d5b-48af-99f3-15329714b63d',
  email: 'dev@wineapp.com',
};

// Development token
const DEV_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwOi8vMTI3LjAuMC4xOjU0MzIxL2F1dGgvdjEiLCJzdWIiOiI0NDNjZTJmZS0xZDViLTQ4YWYtOTlmMy0xNTMyOTcxNGI2M2QiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzQzNDgyMDQ2LCJpYXQiOjE3NDM0Nzg0NDYsImVtYWlsIjoiZGV2QHdpbmVhcHAuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6ImRldkB3aW5lYXBwLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiI0NDNjZTJmZS0xZDViLTQ4YWYtOTlmMy0xNTMyOTcxNGI2M2QifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc0MzQ3ODQ0Nn1dLCJzZXNzaW9uX2lkIjoiZjE3OTc1NzMtMDg5MC00MGU5LTk3YjMtNmY1YTM2NDQ1YmExIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.ohUzmoGBVhAJdNZyyLpTt0dwruGFJd1Iu-6W77UFKpA';

// Auth provider component
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing auth on app load
  useEffect(() => {
    const loadAuth = async () => {
      try {
        if (isDevelopment) {
          // In development, use the predefined credentials
          setUser(DEV_USER);
          setToken(DEV_TOKEN);
          // Store the dev credentials
          await AsyncStorage.setItem('user', JSON.stringify(DEV_USER));
          await AsyncStorage.setItem('token', DEV_TOKEN);
        } else {
          // In production, load from AsyncStorage
          const storedUser = await AsyncStorage.getItem('user');
          const storedToken = await AsyncStorage.getItem('token');

          if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
          }
        }
      } catch (error) {
        console.error('Error loading auth:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      // For development, always use the dev credentials
      if (isDevelopment) {
        setUser(DEV_USER);
        setToken(DEV_TOKEN);
        await AsyncStorage.setItem('user', JSON.stringify(DEV_USER));
        await AsyncStorage.setItem('token', DEV_TOKEN);
        return;
      }

      // For production, implement actual login
      // TODO: Implement real authentication API call
      // Example: const response = await apiClient.post('/auth/login', { email, password });
      // Then set user and token based on response
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear auth state
      setUser(null);
      setToken(null);

      // Clear stored credentials
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Build context value
  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
