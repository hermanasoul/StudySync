import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  user?: User;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
  loading: boolean;
  updateUsername: (newName: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    const token = localStorage.getItem('studysync_token');
    if (token) {
      fetchMe(token).then((currentUser) => {
        if (currentUser) {
          setUser(currentUser);
        } else {
          localStorage.removeItem('studysync_token');
          localStorage.removeItem('studysync_user');
        }
      }).catch(() => {
        localStorage.removeItem('studysync_token');
        localStorage.removeItem('studysync_user');
      });
    }
    setInitialized(true);
    setLoading(false);
  }, []);

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('studysync_token');
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };
    return await fetch(`${API_URL}${endpoint}`, config);
  };

  const fetchMe = async (token: string): Promise<User | null> => {
    try {
      const response = await fetchWithAuth('/auth/me');
      if (!response.ok) return null;
      const data = await response.json();
      if (data.success && data.user) {
        localStorage.setItem('studysync_user', JSON.stringify(data.user));
        return data.user;
      }
      return null;
    } catch (error) {
      console.error('fetchMe error:', error);
      return null;
    }
  };

  const updateUsername = async (newName: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const response = await fetchWithAuth('/auth/user', {
        method: 'PUT',
        body: JSON.stringify({ name: newName }),
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (data.success) {
        const updatedUser = { ...user, name: newName };
        setUser(updatedUser);
        localStorage.setItem('studysync_user', JSON.stringify(updatedUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error('updateUsername error:', error);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('studysync_user', JSON.stringify(data.user));
        }
        if (data.token) {
          localStorage.setItem('studysync_token', data.token);
        }
        return { success: true, user: data.user, token: data.token };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error: any) {
      console.error('Register error:', error);
      return { success: false, error: error.message || 'Network error' };
    }
  };

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('studysync_user', JSON.stringify(data.user));
        }
        if (data.token) {
          localStorage.setItem('studysync_token', data.token);
        }
        return { success: true, user: data.user, token: data.token };
      } else {
        return { success: false, error: data.error || 'Invalid credentials' };
      }
    } catch (error: any) {
      console.error('Login network error:', error);
      return { success: false, error: error.message || 'Network error (server down?)' };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('studysync_token');
      if (token) {
        await fetchWithAuth('/auth/logout', { method: 'POST' });
      }
    } catch (error) {
    } finally {
      setUser(null);
      localStorage.removeItem('studysync_token');
      localStorage.removeItem('studysync_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUsername }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};