import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('studysync_user');
    const token = localStorage.getItem('studysync_token');
    
    if (savedUser && token) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('studysync_user');
        localStorage.removeItem('studysync_token');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        const loggedUser: User = { 
          id: data.user.id || data.user._id, 
          name: data.user.name, 
          email: data.user.email 
        };
        setUser(loggedUser);
        localStorage.setItem('studysync_user', JSON.stringify(loggedUser));
        localStorage.setItem('studysync_token', data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Неверные данные для входа' };
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Fallback для демо - используем реальную логику когда бэкенд готов
      if (email === 'demo@example.com' && password === '123') {
        const demoUser: User = { 
          id: '1', 
          name: 'Демо Пользователь', 
          email: 'demo@example.com' 
        };
        setUser(demoUser);
        localStorage.setItem('studysync_user', JSON.stringify(demoUser));
        localStorage.setItem('studysync_token', 'demo_token');
        return { success: true };
      }
      
      return { success: false, error: 'Ошибка подключения к серверу' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        const newUser: User = { 
          id: data.user.id || data.user._id, 
          name: data.user.name, 
          email: data.user.email 
        };
        setUser(newUser);
        localStorage.setItem('studysync_user', JSON.stringify(newUser));
        localStorage.setItem('studysync_token', data.token);
        return true;
      } else {
        console.error('Registration failed:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Fallback для демо
      const demoUser: User = { 
        id: Date.now().toString(), 
        name: name, 
        email: email 
      };
      setUser(demoUser);
      localStorage.setItem('studysync_user', JSON.stringify(demoUser));
      localStorage.setItem('studysync_token', 'demo_token');
      return true;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('studysync_user');
    localStorage.removeItem('studysync_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
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
