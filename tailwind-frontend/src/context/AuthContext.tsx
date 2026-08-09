import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAppSelector } from '../hooks/hook';

interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  role?: string;
  department?: string;
  avatar?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reduxUser = useAppSelector((state) => state.auth.user);

  // Sync context user state with Redux auth state
  useEffect(() => {
    setUser(reduxUser);
  }, [reduxUser]);

  // Check if user is already logged in on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      } else {
        // Clear inconsistent state
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('isAuth');
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to parse user from localStorage', err);
    } finally {
      setIsLoading(false);
    }

    // Intercept 401 errors globally
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 401) {
        console.warn('Unauthorized request detected. Logging out...');
        logout();
      }
      return res;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Real login - calls backend API
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }
      const { token, user } = data;
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      localStorage.setItem('isAuth', 'true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Real signup - calls backend API
  const signup = async (name: string, email: string, password: string, company?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, company, role: 'admin', department: 'management' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Signup failed');
      }
      const { token, user } = data;
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      localStorage.setItem('isAuth', 'true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('isAuth');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!(user && localStorage.getItem('token')),
    isLoading,
    login,
    signup,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
