import api from './api';
import Cookies from 'js-cookie';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  profilePicture?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: AdminUser;
    token: string;
    refreshToken: string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

class AuthService {
  private readonly TOKEN_KEY = 'admin_token';
  private readonly USER_KEY = 'admin_user';
  private readonly REFRESH_TOKEN_KEY = 'admin_refresh_token';

  // Login admin user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/login', credentials);
      const { data } = response.data;

      // Store tokens and user data
      this.setToken(data.token);
      this.setRefreshToken(data.refreshToken);
      this.setUser(data.user);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }

  // Register admin user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/register', {
        ...userData,
        role: 'admin', // Force admin role for admin panel
      });
      const { data } = response.data;

      // Store tokens and user data
      this.setToken(data.token);
      this.setRefreshToken(data.refreshToken);
      this.setUser(data.user);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  // Logout admin user
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      this.clearAuth();
    }
  }

  // Forgot password
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to send reset email');
    }
  }

  // Reset password
  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to reset password');
    }
  }

  // Refresh token
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      const { token } = response.data.data;
      
      this.setToken(token);
      return token;
    } catch (error: any) {
      this.clearAuth();
      throw new Error('Token refresh failed');
    }
  }

  // Get current user
  async getCurrentUser(): Promise<AdminUser> {
    try {
      const response = await api.get('/users/profile');
      const user = response.data.data;
      this.setUser(user);
      return user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get user profile');
    }
  }

  // Update user profile
  async updateProfile(userData: Partial<AdminUser>): Promise<AdminUser> {
    try {
      const response = await api.put('/users/profile', userData);
      const user = response.data.data;
      this.setUser(user);
      return user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update profile');
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  }

  // Check if user is admin
  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'admin';
  }

  // Token management
  setToken(token: string): void {
    Cookies.set(this.TOKEN_KEY, token, { expires: 7, secure: true, sameSite: 'strict' });
  }

  getToken(): string | null {
    return Cookies.get(this.TOKEN_KEY) || null;
  }

  setRefreshToken(refreshToken: string): void {
    Cookies.set(this.REFRESH_TOKEN_KEY, refreshToken, { expires: 30, secure: true, sameSite: 'strict' });
  }

  getRefreshToken(): string | null {
    return Cookies.get(this.REFRESH_TOKEN_KEY) || null;
  }

  // User management
  setUser(user: AdminUser): void {
    Cookies.set(this.USER_KEY, JSON.stringify(user), { expires: 7, secure: true, sameSite: 'strict' });
  }

  getUser(): AdminUser | null {
    const userStr = Cookies.get(this.USER_KEY);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // Clear all auth data
  clearAuth(): void {
    Cookies.remove(this.TOKEN_KEY);
    Cookies.remove(this.USER_KEY);
    Cookies.remove(this.REFRESH_TOKEN_KEY);
  }
}

export default new AuthService();
