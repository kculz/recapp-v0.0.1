import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { getSecurely, saveSecurely, deleteSecurely } from '../utils/storage';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  clientType?: string | null;
  assignedCounselorId?: number | null;
}

interface AuthContextType {
  userToken: string | null;
  mfaToken: string | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; requireMfa?: boolean; error?: string }>;
  confirmMfa: (code: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signUpActivation: (token: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  apiUrl: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const getBackendUrl = () => {
  // In Expo Go dev, local backend is usually on port 5001.
  // For Android emulator, use 10.0.2.2.
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001/api/v1';
  }
  return 'http://localhost:5001/api/v1';
};

export const API_URL = getBackendUrl();

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load token and user info on mount
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await getSecurely('userToken');
        const userDataStr = await getSecurely('userData');
        if (token && userDataStr) {
          setUserToken(token);
          setUser(JSON.parse(userDataStr));
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrapAsync();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        return { success: false, error: resData.error || 'Login failed.' };
      }

      if (resData.requireMfa) {
        setMfaToken(resData.mfaToken);
        return { success: true, requireMfa: true };
      }

      return { success: false, error: 'Unexpected login response.' };
    } catch (err: any) {
      console.error('Sign-in network error:', err);
      return { success: false, error: 'Network error or backend server offline.' };
    }
  };

  const confirmMfa = async (code: string) => {
    try {
      if (!mfaToken) {
        return { success: false, error: 'No active authentication session.' };
      }

      const response = await fetch(`${API_URL}/auth/verify-mfa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, mfaToken }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        return { success: false, error: resData.error || 'Verification failed.' };
      }

      // Save token and user details
      await saveSecurely('userToken', resData.token);
      await saveSecurely('userData', JSON.stringify(resData.user));

      setUserToken(resData.token);
      setUser(resData.user);
      setMfaToken(null);

      return { success: true, user: resData.user };
    } catch (err: any) {
      console.error('MFA validation error:', err);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const signUpActivation = async (token: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        return { success: false, error: resData.error || 'Activation failed.' };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Activation network error:', err);
      return { success: false, error: 'Network error. Check server status.' };
    }
  };

  const signOut = async () => {
    try {
      await deleteSecurely('userToken');
      await deleteSecurely('userData');
      setUserToken(null);
      setUser(null);
      setMfaToken(null);
    } catch (e) {
      console.error('Error signing out:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        userToken,
        mfaToken,
        user,
        isLoading,
        signIn,
        confirmMfa,
        signUpActivation,
        signOut,
        apiUrl: API_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
