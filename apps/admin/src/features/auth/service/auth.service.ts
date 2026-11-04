import axios from 'axios';
import { apiClient } from '../../../lib/api-client';
import { AdminUser, AdminRole } from '../../../types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface AdminLoginPayload {
  username: string;
  password?: string;
  role?: AdminRole;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password?: string;
  phoneNumber?: string;
}

export interface AuthResponseData {
  user: AdminUser;
  tokens?: AuthTokens;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface StaffInvitationItem {
  id: string;
  email: string;
  role: AdminRole;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
  invitedBy?: {
    id: string;
    email?: string;
    profile?: { name?: string | null };
  };
}

export interface InvitationDetails {
  email: string;
  role: AdminRole;
  invitedBy: string;
  expiresAt: string;
}

export const authService = {
  // Authenticates administrative staff via username/password and role.
  // The server issues secure HTTP-only cookies to maintain session persistence.
  async adminLogin(payload: AdminLoginPayload): Promise<AuthResponseData> {
    const { data } = await apiClient.post<ApiResponse<any>>('/auth/admin-login', {
      username: payload.username.trim(),
      password: payload.password,
      role: payload.role || 'ADMIN',
    });
    const rawUser = data.data.user;
    const user: AdminUser = {
      id: rawUser.id,
      email: rawUser.email,
      phoneNumber: rawUser.phoneNumber,
      role: rawUser.role,
      name: rawUser.name || rawUser.profile?.name || rawUser.email?.split('@')[0] || 'Admin',
      permissions: rawUser.permissions || [],
    };
    return { user, tokens: data.data.tokens };
  },

  // Registers a new user account with credentials and optional phone number.
  // Returns user profile data and initial session tokens.
  async register(payload: RegisterPayload): Promise<AuthResponseData> {
    const { data } = await apiClient.post<ApiResponse<any>>('/auth/register', payload);
    const rawUser = data.data.user;
    const user: AdminUser = {
      id: rawUser.id,
      email: rawUser.email,
      phoneNumber: rawUser.phoneNumber,
      role: rawUser.role,
      name: rawUser.name || rawUser.profile?.name || rawUser.email?.split('@')[0] || 'Staff',
      permissions: rawUser.permissions || [],
    };
    return { user, tokens: data.data.tokens };
  },

  // Authenticates standard users using email and password credentials.
  // Sets session cookies and returns profile information.
  async login(payload: { email: string; password?: string }): Promise<AuthResponseData> {
    const { data } = await apiClient.post<ApiResponse<any>>('/auth/login', payload);
    const rawUser = data.data.user;
    const user: AdminUser = {
      id: rawUser.id,
      email: rawUser.email,
      phoneNumber: rawUser.phoneNumber,
      role: rawUser.role,
      name: rawUser.name || rawUser.profile?.name || rawUser.email?.split('@')[0] || 'User',
      permissions: rawUser.permissions || [],
    };
    return { user, tokens: data.data.tokens };
  },

  // Requests fresh authentication tokens using the HTTP-only refresh cookie.
  // Fastify verifies the cookie against the database hash and rotates tokens.
  async refreshToken(): Promise<AuthTokens> {
    const { data } = await axios.post<ApiResponse<AuthTokens>>(
      '/api/v1/auth/refresh',
      {},
      { withCredentials: true }
    );
    return data.data;
  },

  // Fetches current authenticated staff identity and role permissions.
  // Automatically called on app launch to populate user session state.
  async getMe(): Promise<AdminUser> {
    const { data } = await apiClient.get<ApiResponse<any>>('/auth/me');
    const rawUser = data.data;
    return {
      id: rawUser.id,
      email: rawUser.email,
      phoneNumber: rawUser.phoneNumber,
      role: rawUser.role,
      name: rawUser.name || rawUser.profile?.name || rawUser.email?.split('@')[0] || 'Admin',
      permissions: rawUser.permissions || [],
    };
  },

  // Ends current session by invalidating refresh tokens on the backend.
  // Clears HTTP-only cookies and resets local client application state.
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  // Generates a 48-hour onboarding invitation link for a target staff email.
  // Restricted strictly to super administrators with role management privileges.
  async createStaffInvitation(payload: { email: string; role: AdminRole }): Promise<{ invitation: StaffInvitationItem; inviteLink: string }> {
    const { data } = await apiClient.post<ApiResponse<{ invitation: StaffInvitationItem; inviteLink: string }>>('/admin/invitations', payload);
    return data.data;
  },

  // Retrieves all staff invitations with their current lifecycle statuses.
  // Used in the Roles & Permissions dashboard to track pending invites.
  async getStaffInvitations(): Promise<StaffInvitationItem[]> {
    const { data } = await apiClient.get<ApiResponse<StaffInvitationItem[]>>('/admin/invitations');
    return data.data;
  },

  // Cancels an active pending staff invitation so it can no longer be claimed.
  // Prevents unauthorized onboarding if an invitation was sent by mistake.
  async revokeStaffInvitation(id: string): Promise<StaffInvitationItem> {
    const { data } = await apiClient.delete<ApiResponse<StaffInvitationItem>>(`/admin/invitations/${id}`);
    return data.data;
  },

  // Validates an invitation token and returns the invited email and role.
  // Allows the public invite acceptance screen to display team context.
  async getInvitationDetails(token: string): Promise<InvitationDetails> {
    const { data } = await apiClient.get<ApiResponse<InvitationDetails>>(`/auth/invitation/${token}`);
    return data.data;
  },

  // Completes staff onboarding by establishing account password and user profile.
  // Activates the staff user in the database and returns authenticated session cookies.
  async acceptStaffInvitation(payload: { token: string; name: string; password: string; phoneNumber?: string }): Promise<AuthResponseData> {
    const { data } = await apiClient.post<ApiResponse<any>>('/auth/accept-invitation', payload);
    const rawUser = data.data.user;
    const user: AdminUser = {
      id: rawUser.id,
      email: rawUser.email,
      phoneNumber: rawUser.phoneNumber,
      role: rawUser.role,
      name: rawUser.name || rawUser.profile?.name || 'Staff Member',
      permissions: rawUser.permissions || [],
    };
    return { user, tokens: data.data.tokens };
  },
};
