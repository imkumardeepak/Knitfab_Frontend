import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, userApi, apiUtils } from '@/lib/api-client';
import type { LoginRequestDto, AuthUserDto, AuthPageAccessDto } from '@/types/api-types';

interface AuthContextType {
  user: AuthUserDto | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  pageAccesses: AuthPageAccessDto[];
  login: (credentials: LoginRequestDto) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  hasRole: (role: string) => boolean;
  hasPermission: (pageName: string, action: 'View' | 'Add' | 'Edit' | 'Delete') => boolean;
  isAdmin: () => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageAccesses, setPageAccesses] = useState<AuthPageAccessDto[]>([]);

  // Helper function to get page accesses from localStorage
  const getPageAccessesFromStorage = (): AuthPageAccessDto[] => {
    try {
      const stored = localStorage.getItem('auth_page_accesses');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading page accesses from localStorage:', error);
      return [];
    }
  };

  // Helper function to save page accesses to localStorage
  const savePageAccessesToStorage = (accesses: AuthPageAccessDto[]): void => {
    try {
      localStorage.setItem('auth_page_accesses', JSON.stringify(accesses));
    } catch (error) {
      console.error('Error saving page accesses to localStorage:', error);
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUser = localStorage.getItem('auth_user');
        const savedToken = apiUtils.getAuthToken();
        const savedPageAccesses = getPageAccessesFromStorage();

        if (savedUser && savedToken) {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
          setPageAccesses(savedPageAccesses);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        apiUtils.clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (
    credentials: LoginRequestDto
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      const response = await authApi.login(credentials);
      const loginResult = apiUtils.extractData(response);

      setUser(loginResult.user);
      setToken(loginResult.token);
      setPageAccesses(loginResult.pageAccesses);

      // Store auth data
      apiUtils.setAuthToken(loginResult.token);
      localStorage.setItem('auth_refresh_token', loginResult.refreshToken);
      localStorage.setItem('auth_user', JSON.stringify(loginResult.user));
      savePageAccessesToStorage(loginResult.pageAccesses);

      return { success: true };
    } catch (error: unknown) {
      console.error('Login error:', error);
      const errorMessage = apiUtils.handleError(error);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to refresh the token manually
  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('auth_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authApi.refreshToken({ refreshToken });
      const refreshResult = apiUtils.extractData(response);

      setUser(refreshResult.user);
      setToken(refreshResult.token);
      setPageAccesses(refreshResult.pageAccesses);

      // Update stored auth data
      apiUtils.setAuthToken(refreshResult.token);
      localStorage.setItem('auth_refresh_token', refreshResult.refreshToken);
      localStorage.setItem('auth_user', JSON.stringify(refreshResult.user));
      savePageAccessesToStorage(refreshResult.pageAccesses);

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Note: There is no logout endpoint in the backend API
      // We just clear the local storage and state
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      setPageAccesses([]);
      apiUtils.clearAuth();
      // Clear page accesses from localStorage on logout
      localStorage.removeItem('auth_page_accesses');
      setIsLoading(false);
    }
  };

  const hasRole = (role: string): boolean => {
    return user?.roleName === role;
  };

  const hasPermission = (
    pageName: string,
    action: 'View' | 'Add' | 'Edit' | 'Delete' = 'View'
  ): boolean => {
    const page = pageAccesses.find((p) => p.pageName === pageName);
    if (!page) return false;

    switch (action) {
      case 'View':
        return page.isView;
      case 'Add':
        return page.isAdd;
      case 'Edit':
        return page.isEdit;
      case 'Delete':
        return page.isDelete;
      default:
        return false;
    }
  };

  const isAdmin = (): boolean => {
    return user?.roleName === 'Admin' || user?.roleName === 'admin';
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await userApi.getProfile();
      const userData = apiUtils.extractData(response);
      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    pageAccesses,
    login,
    logout,
    refreshToken,
    hasRole,
    hasPermission,
    isAdmin,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};