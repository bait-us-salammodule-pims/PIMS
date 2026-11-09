import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authService } from '../api/authService';
import type { CurrentUserResponse, LoginRequest } from '../types/auth';

interface AuthContextType {
  user: CurrentUserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => authService.getToken());
  const [user, setUser] = useState<CurrentUserResponse | null>(() => authService.getCachedUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate existing session on application boot
  const verifySession = useCallback(async () => {
    const existingToken = authService.getToken();
    if (!existingToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setToken(existingToken);
    } catch {
      // Session invalid or expired
      authService.logout();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const login = async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const authResponse = await authService.login(credentials);
      setToken(authResponse.token);

      // Fetch complete scoped profile from /api/auth/me
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  }, []);

  const refreshUser = async (): Promise<void> => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  /**
   * Checks if the authenticated user has a specific permission code.
   * SuperAdmin role automatically bypasses individual permission checks.
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      if (user.roles?.some((r) => r.toLowerCase() === 'superadmin')) {
        return true;
      }
      return user.permissions?.some(
        (p) => p.toLowerCase() === permission.toLowerCase()
      ) ?? false;
    },
    [user]
  );

  /**
   * Checks if user has any of the given permissions
   */
  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      if (user.roles?.some((r) => r.toLowerCase() === 'superadmin')) {
        return true;
      }
      return permissions.some((p) => hasPermission(p));
    },
    [user, hasPermission]
  );

  /**
   * Checks if the authenticated user has a specific role name.
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user) return false;
      return user.roles?.some(
        (r) => r.toLowerCase() === role.toLowerCase()
      ) ?? false;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasRole,
        hasAnyPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
