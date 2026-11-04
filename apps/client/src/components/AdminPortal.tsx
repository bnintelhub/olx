import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  LayoutDashboard,
  ShieldAlert,
  LogOut,
  ExternalLink,
  Search,
  CheckCircle,
  AlertTriangle,
  Users,
  Clock,
  Trash2,
  Tag,
  Key,
  Layers,
  Sparkles,
  Menu,
  Bell,
  Calendar,
  RefreshCw,
  FileText,
  LayoutGrid,
  Car,
  Smartphone,
  Bike,
  Home,
  Tv,
  Armchair,
  Truck,
  Shirt,
  BookOpen,
  Dog,
  Wrench,
  Briefcase,
  Edit3,
  Eye,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  BarChart3,
  MessageSquare,
  Settings,
  Sun,
  Moon,
  Plus,
  User,
  Lock,
  EyeOff,
} from 'lucide-react';
import { Category, LocationItem } from '../types';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '../admin/components/feedback/AdminFeedback';
import { AdminStatusBadge } from '../admin/components/data-table/AdminStatusBadge';
import { AdminPageHeader } from '../admin/components/layout/AdminPageHeader';
import { AdminConfirmDialog } from '../admin/components/forms/AdminConfirmDialog';

interface AdminStats {
  totalAds: number;
  activeAds: number;
  pendingAds: number;
  rejectedAds: number;
  soldAds: number;
  totalCategories: number;
  totalUsers: number;
  activeUsers: number;
  totalReports: number;
  totalConversations: number;
}

interface TrendPoint {
  date: string;
  count: number;
}

interface DashboardTrend {
  date: string;
  count: number;
}

interface AdminPortalProps {
  onExitToCustomerSite: () => void;
  categories: Category[];
  cities: LocationItem[];
  onRefreshData?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onExitToCustomerSite,
  categories,
  cities,
  onRefreshData,
}) => {
  // Authentication State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const isAdmin = adminUser?.role === 'ADMIN';

  // Navigation State
  const [activeTab, setActiveTab] = useState<
    | 'DASHBOARD'
    | 'CATEGORIES'
    | 'ALL_ADS'
    | 'USERS'
    | 'ANALYTICS'
    | 'MESSAGES'
    | 'MODERATION'
    | 'SETTINGS'
  >('DASHBOARD');

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Theme State: Light Theme by default per user requirement
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('admin_portal_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    return 'light'; // Default to Light theme
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('admin_portal_theme', next);
      } catch (e) {}
      return next;
    });
  };

  // Dashboard Stats State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [recentAds, setRecentAds] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userTrendData, setUserTrendData] = useState<DashboardTrend[]>([]);
  const [cityBreakdown, setCityBreakdown] = useState<{ id: string; name: string; count: number }[]>([]);
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; point: TrendPoint } | null>(null);

  // All Ads Management State
  const [allAds, setAllAds] = useState<any[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adFilterStatus, setAdFilterStatus] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [adSearchQuery, setAdSearchQuery] = useState('');
  const [adPage, setAdPage] = useState(1);
  const [adTotalPages, setAdTotalPages] = useState(1);
  const [adSort, setAdSort] = useState('createdAt');
  const [adOrder, setAdOrder] = useState('desc');
  const [adLocationFilter, setAdLocationFilter] = useState('');
  const [adSellerFilter, setAdSellerFilter] = useState('');
  const [adReportedFilter, setAdReportedFilter] = useState('');
  const [adMinPrice, setAdMinPrice] = useState('');
  const [adMaxPrice, setAdMaxPrice] = useState('');
  const [adFrom, setAdFrom] = useState('');
  const [adTo, setAdTo] = useState('');
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);
  const [adDetailLoading, setAdDetailLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: string; status: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);



  // Create Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatParentId, setNewCatParentId] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIconUrl, setNewCatIconUrl] = useState('');
  const [newCatDisplayOrder, setNewCatDisplayOrder] = useState('0');
  const [newCatIsActive, setNewCatIsActive] = useState(true);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categorySuccess, setCategorySuccess] = useState(false);
  const [categoryTree, setCategoryTree] = useState<any[]>([]);
  const [categoryBuilderLoading, setCategoryBuilderLoading] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [attributeCategoryId, setAttributeCategoryId] = useState('');
  const [attributeName, setAttributeName] = useState('');
  const [attributeKey, setAttributeKey] = useState('');
  const [attributeLabel, setAttributeLabel] = useState('');
  const [attributeType, setAttributeType] = useState('TEXT');
  const [attributeOptions, setAttributeOptions] = useState('');
  const [attributeUnit, setAttributeUnit] = useState('');
  const [attributeRequired, setAttributeRequired] = useState(false);
  const [attributeFilterable, setAttributeFilterable] = useState(true);
  const [attributeDisplayOrder, setAttributeDisplayOrder] = useState('0');
  const [attributeValidation, setAttributeValidation] = useState('');
  const [addingAttribute, setAddingAttribute] = useState(false);
  const [locationTree, setLocationTree] = useState<any[]>([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationSlug, setNewLocationSlug] = useState('');
  const [newLocationType, setNewLocationType] = useState('CITY');
  const [newLocationParentId, setNewLocationParentId] = useState('');
  const [newLocationPincode, setNewLocationPincode] = useState('');
  const [newLocationLat, setNewLocationLat] = useState('');
  const [newLocationLng, setNewLocationLng] = useState('');
  const [newLocationIsActive, setNewLocationIsActive] = useState(true);
  const [creatingLocation, setCreatingLocation] = useState(false);

  // Moderation Queue State
  const [pendingAds, setPendingAds] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [opsLoading, setOpsLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [restrictedMessages, setRestrictedMessages] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState<Record<string, any>>({});

  // Admin Profile & Password Settings State
  const [adminProfileName, setAdminProfileName] = useState('');
  const [adminProfileEmail, setAdminProfileEmail] = useState('');
  const [adminProfilePhone, setAdminProfilePhone] = useState('');
  const [adminProfileBio, setAdminProfileBio] = useState('');
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);
  const [adminProfileMsg, setAdminProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search input ref for Ctrl+K
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Keyboard shortcut Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Verify saved admin session on mount and rotate the access token when needed.
  useEffect(() => {
    let active = true;

    const clearInvalidSession = () => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('olx_access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('olx_refresh_token');
    };

    const restoreAdminSession = async () => {
      const savedToken = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const refreshToken = localStorage.getItem('olx_refresh_token');

      if (!savedToken) {
        if (active) setIsCheckingSession(false);
        return;
      }

      try {
        let token = savedToken;
        let meResponse = await fetch('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (meResponse.status === 401 && refreshToken) {
          const refreshResponse = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          const refreshData = await refreshResponse.json();
          if (refreshResponse.ok && refreshData.success && refreshData.data) {
            token = refreshData.data.accessToken;
            localStorage.setItem('adminToken', token);
            localStorage.setItem('olx_access_token', token);
            localStorage.setItem('token', token);
            if (refreshData.data.refreshToken) {
              localStorage.setItem('olx_refresh_token', refreshData.data.refreshToken);
            }
            meResponse = await fetch('/api/v1/auth/me', {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }

        const meData = await meResponse.json();
        if (!meResponse.ok || !meData.success || !meData.data) {
          clearInvalidSession();
          onExitToCustomerSite();
          return;
        }

        if (!['ADMIN', 'MODERATOR'].includes(meData.data.role)) {
          clearInvalidSession();
          onExitToCustomerSite();
          return;
        }

        if (active) {
          setAdminUser(meData.data);
          localStorage.setItem('adminUser', JSON.stringify(meData.data));
          setIsAdminLoggedIn(true);
        }
      } catch (error) {
        console.error('Failed to restore admin session:', error);
        clearInvalidSession();
        onExitToCustomerSite();
      } finally {
        if (active) setIsCheckingSession(false);
      }
    };

    restoreAdminSession();
    return () => {
      active = false;
    };
  }, [onExitToCustomerSite]);

  // Fetch Stats when Logged In
  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchAdminStats();
    }
  }, [isAdminLoggedIn]);



  // Fetch All Ads when tab is ALL_ADS
  useEffect(() => {
    if (isAdminLoggedIn && activeTab === 'ALL_ADS') {
      fetchAdminAds();
    }
  }, [isAdminLoggedIn, activeTab, adFilterStatus, selectedCategoryFilter, adPage, adSort, adOrder, adLocationFilter, adSellerFilter, adReportedFilter, adMinPrice, adMaxPrice, adFrom, adTo]);

  // Fetch Moderation queue when tab is MODERATION
  useEffect(() => {
    if (isAdminLoggedIn && activeTab === 'MODERATION') {
      fetchModerationQueue();
    }
  }, [isAdminLoggedIn, activeTab]);

  useEffect(() => {
    if (isAdminLoggedIn && activeTab === 'MESSAGES') fetchOperations();
  }, [isAdminLoggedIn, activeTab]);

  useEffect(() => {
    if (isAdminLoggedIn && activeTab === 'SETTINGS') {
      fetchPlatformSettings();
      fetchAdminProfile();
    }
  }, [isAdminLoggedIn, activeTab]);

  useEffect(() => {
    if (isAdminLoggedIn && activeTab === 'USERS') fetchAdminUsers();
  }, [isAdminLoggedIn, activeTab, userPage, userStatusFilter, userRoleFilter, userTypeFilter]);

  useEffect(() => {
    if (isAdminLoggedIn && activeTab === 'CATEGORIES') {
      fetchCategoryBuilderData();
      fetchLocationAdminData();
    }
  }, [isAdminLoggedIn, activeTab]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/v1/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        localStorage.setItem('adminToken', data.data.tokens.accessToken);
        localStorage.setItem('adminUser', JSON.stringify(data.data.user));
        localStorage.setItem('olx_access_token', data.data.tokens.accessToken);
        localStorage.setItem('token', data.data.tokens.accessToken);
        setAdminUser(data.data.user);
        setIsAdminLoggedIn(true);
      } else {
        setLoginError(data.error?.message || 'Invalid admin credentials');
      }
    } catch {
      setLoginError('Unable to connect to authentication service');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
    if (token) {
      fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch((error) => console.error('Admin logout request failed:', error));
    }
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAdminLoggedIn(false);
    setAdminUser(null);
  };

  const fetchAdminStats = async () => {
    setLoadingStats(true);
    setStatsError('');
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const res = await fetch(`/api/v1/admin/stats${params.toString() ? `?${params}` : ''}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (data.success && data.data) {
        setStats(data.data.stats);
        setCategoryBreakdown(data.data.categoryBreakdown || []);
        setRecentAds(data.data.recentAds || []);
        setTrendData(
          (data.data.trends?.listings || []).map((point: DashboardTrend) => ({
            date: point.date,
            count: point.count,
          }))
        );
        setUserTrendData(data.data.trends?.users || []);
        setCityBreakdown(data.data.cityBreakdown || []);
        setPendingQueue(data.data.pendingQueue || []);
        setRecentReports(data.data.recentReports || []);
        setRecentActivity(data.data.recentActivity || []);
      } else {
        setStatsError(data.error?.message || 'Unable to load dashboard metrics.');
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setStatsError('Unable to load dashboard metrics. Please retry.');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAdminAds = async () => {
    setAdsLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const queryParams = new URLSearchParams({
        page: String(adPage),
        limit: '20',
        status: adFilterStatus,
        sort: adSort,
        order: adOrder,
      });
      if (adSearchQuery) queryParams.set('q', adSearchQuery);
      if (selectedCategoryFilter) queryParams.set('categoryId', selectedCategoryFilter);
      if (adLocationFilter) queryParams.set('locationId', adLocationFilter);
      if (adSellerFilter) queryParams.set('sellerId', adSellerFilter);
      if (adReportedFilter) queryParams.set('reported', adReportedFilter);
      if (adMinPrice) queryParams.set('minPrice', adMinPrice);
      if (adMaxPrice) queryParams.set('maxPrice', adMaxPrice);
      if (adFrom) queryParams.set('from', adFrom);
      if (adTo) queryParams.set('to', adTo);

      const res = await fetch(`/api/v1/admin/ads?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.ads) {
        setAllAds(data.data.ads);
        setAdTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching ads:', err);
    } finally {
      setAdsLoading(false);
    }
  };

  const fetchAdDetail = async (id: string) => {
    setAdDetailLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const res = await fetch(`/api/v1/admin/ads/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setSelectedAd(data.data);
      else alert(data.error?.message || 'Unable to load listing details');
    } finally {
      setAdDetailLoading(false);
    }
  };

  const fetchModerationQueue = async () => {
    setModerationLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const [pendingRes, reportsRes] = await Promise.all([
        fetch('/api/v1/moderation/pending', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/admin/reports', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const pendingData = await pendingRes.json();
      const reportsData = await reportsRes.json();
      if (pendingData.success) setPendingAds(pendingData.data.ads || []);
      if (reportsData.success) setReports(reportsData.data.reports || []);
    } catch (err) {
      console.error('Error fetching moderation queue:', err);
    } finally {
      setModerationLoading(false);
    }
  };

  const fetchOperations = async () => {
    setOpsLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const [conversationResponse, ticketResponse, reportResponse] = await Promise.all([
        fetch('/api/v1/admin/conversations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/admin/support-tickets', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/admin/reports', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [conversationData, ticketData, reportData] = await Promise.all([conversationResponse.json(), ticketResponse.json(), reportResponse.json()]);
      if (conversationData.success) setConversations(conversationData.data.conversations || []);
      if (ticketData.success) setTickets(ticketData.data.tickets || []);
      if (reportData.success) setReports(reportData.data.reports || []);
    } finally { setOpsLoading(false); }
  };

  const fetchPlatformSettings = async () => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
    const response = await fetch('/api/v1/admin/settings', { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json(); if (data.success) setPlatformSettings(data.data || {});
  };
  const savePlatformSetting = async (key: string, value: any) => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
    const response = await fetch('/api/v1/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ key, value }) });
    const data = await response.json(); if (!data.success) return alert(data.error?.message || 'Setting was not saved'); await fetchPlatformSettings();
  };

  const fetchAdminProfile = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const response = await fetch('/api/v1/admin/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data) {
        const u = data.data;
        setAdminUser(u);
        setAdminProfileName(u.profile?.name || '');
        setAdminProfileEmail(u.email || '');
        setAdminProfilePhone(u.phoneNumber || '');
        setAdminProfileBio(u.profile?.bio || '');
      }
    } catch (err) {
      console.error('Error fetching admin profile:', err);
      if (adminUser) {
        setAdminProfileName(adminUser.profile?.name || '');
        setAdminProfileEmail(adminUser.email || '');
        setAdminProfilePhone(adminUser.phoneNumber || '');
        setAdminProfileBio(adminUser.profile?.bio || '');
      }
    }
  };

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminProfileName.trim()) {
      setAdminProfileMsg({ type: 'error', text: 'Admin name is required' });
      return;
    }
    setSavingAdminProfile(true);
    setAdminProfileMsg(null);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const response = await fetch('/api/v1/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: adminProfileName.trim(),
          email: adminProfileEmail.trim() || undefined,
          phoneNumber: adminProfilePhone.trim() || undefined,
          bio: adminProfileBio.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setAdminUser(data.data);
        localStorage.setItem('adminUser', JSON.stringify(data.data));
        setAdminProfileMsg({ type: 'success', text: 'Admin profile updated successfully!' });
      } else {
        setAdminProfileMsg({ type: 'error', text: data.error?.message || 'Failed to update profile' });
      }
    } catch {
      setAdminProfileMsg({ type: 'error', text: 'Error updating admin profile' });
    } finally {
      setSavingAdminProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter current password' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirm password do not match' });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const response = await fetch('/api/v1/admin/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordMsg({ type: 'success', text: 'Admin password updated successfully!' });
      } else {
        setPasswordMsg({ type: 'error', text: data.error?.message || 'Failed to change password' });
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Error updating password' });
    } finally {
      setSavingPassword(false);
    }
  };

  const updateReport = async (id: string, status: string) => {
    const resolutionReason = ['RESOLVED', 'DISMISSED'].includes(status) ? window.prompt('Resolution reason (required):')?.trim() : undefined;
    if (['RESOLVED', 'DISMISSED'].includes(status) && !resolutionReason) return;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
    const response = await fetch(`/api/v1/admin/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status, internalNote: window.prompt('Internal investigation note (optional):') || undefined, resolutionReason }) });
    const data = await response.json();
    if (!data.success) return alert(data.error?.message || 'Could not update report');
    fetchModerationQueue();
  };

  const viewRestrictedConversation = async (conversation: any) => {
    const report = reports.find((item) => item.conversationId === conversation.id || item.message?.conversationId === conversation.id);
    if (!report) return alert('Message content is private. It can only be opened from an authorized report linked to this conversation.');
    const accessReason = window.prompt('Why is message evidence needed? (minimum 10 characters)')?.trim();
    if (!accessReason || accessReason.length < 10) return;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
    const response = await fetch(`/api/v1/admin/conversations/${conversation.id}/messages?reportId=${encodeURIComponent(report.id)}&accessReason=${encodeURIComponent(accessReason)}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!data.success) return alert(data.error?.message || 'Evidence access was not authorized');
    setSelectedConversation(conversation); setRestrictedMessages(data.data.messages || []);
  };

  const fetchAdminUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const params = new URLSearchParams({ page: String(userPage), limit: '20' });
      if (userSearch) params.set('q', userSearch);
      if (userStatusFilter) params.set('status', userStatusFilter);
      if (userRoleFilter) params.set('role', userRoleFilter);
      if (userTypeFilter) params.set('accountType', userTypeFilter);
      const res = await fetch(`/api/v1/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Unable to load users');
      setAdminUsers(data.data.users || []);
      setUserTotalPages(data.data.pagination?.totalPages || 1);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Unable to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchUserDetail = async (id: string) => {
    setUserDetailLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const res = await fetch(`/api/v1/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Unable to load user');
      setSelectedUser(data.data.user);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to load user');
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleUserAction = async (id: string, action: string) => {
    const reason = window.prompt('Enter a mandatory reason (minimum 5 characters):')?.trim();
    if (!reason || reason.length < 5) return;
    if (!window.confirm(`Confirm ${action.toLowerCase()} for this user?`)) return;
    const accountType = action === 'CLASSIFY' ? window.prompt('Account type: INDIVIDUAL, DEALER, or BUSINESS')?.trim().toUpperCase() : undefined;
    if (action === 'CLASSIFY' && !accountType) return;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
    const res = await fetch(`/api/v1/admin/users/${id}/action`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, reason, accountType }),
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error?.message || 'User action failed');
      return;
    }
    fetchAdminUsers();
    fetchUserDetail(id);
  };

  const fetchCategoryBuilderData = async () => {
    setCategoryBuilderLoading(true);
    try {
      const res = await fetch('/api/v1/categories/tree');
      const data = await res.json();
      if (data.success) {
        setCategoryTree(data.data || []);
      }
    } catch (error) {
      console.error('Error loading category tree:', error);
    } finally {
      setCategoryBuilderLoading(false);
    }
  };

  const fetchLocationAdminData = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const params = new URLSearchParams();
      if (locationQuery.trim()) params.set('q', locationQuery.trim());
      const res = await fetch(`/api/v1/locations/admin?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setLocationTree(data.data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleCategoryAttributeCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!attributeCategoryId || !attributeName.trim() || !attributeKey.trim()) return;
    setAddingAttribute(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const payload: any = {
        name: attributeName.trim(),
        key: attributeKey.trim().toLowerCase(),
        displayLabel: attributeLabel.trim() || undefined,
        type: attributeType,
        isRequired: attributeRequired,
        isFilterable: attributeFilterable,
        unit: attributeUnit.trim() || undefined,
        displayOrder: Number(attributeDisplayOrder) || 0,
      };
      if (attributeOptions.trim()) {
        payload.options = attributeOptions.split(',').map((value) => value.trim()).filter(Boolean);
      }
      if (attributeValidation.trim()) {
        payload.validationRules = JSON.parse(attributeValidation);
      }
      const res = await fetch(`/api/v1/categories/${attributeCategoryId}/attributes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error?.message || 'Failed to create attribute');
        return;
      }
      setAttributeName('');
      setAttributeKey('');
      setAttributeLabel('');
      setAttributeOptions('');
      setAttributeUnit('');
      setAttributeValidation('');
      setAttributeDisplayOrder('0');
      fetchCategoryBuilderData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create attribute');
    } finally {
      setAddingAttribute(false);
    }
  };

  const handleLocationCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newLocationName.trim() || !newLocationLat || !newLocationLng) return;
    setCreatingLocation(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const payload: any = {
        name: newLocationName.trim(),
        slug: newLocationSlug.trim() || undefined,
        type: newLocationType,
        latitude: Number(newLocationLat),
        longitude: Number(newLocationLng),
        pincode: newLocationPincode.trim() || undefined,
        isActive: newLocationIsActive,
      };
      if (newLocationParentId) payload.parentId = newLocationParentId;
      const res = await fetch('/api/v1/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error?.message || 'Failed to create location');
        return;
      }
      setNewLocationName('');
      setNewLocationSlug('');
      setNewLocationPincode('');
      setNewLocationLat('');
      setNewLocationLng('');
      setNewLocationParentId('');
      setNewLocationType('CITY');
      setNewLocationIsActive(true);
      fetchLocationAdminData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create location');
    } finally {
      setCreatingLocation(false);
    }
  };

  const handleUpdateAdStatus = async (adId: string, newStatus: string, reason?: string) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const res = await fetch(`/api/v1/admin/ads/${adId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, rejectionReason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAdminAds();
        fetchAdminStats();
        setPendingAction(null);
        setRejectionReason('');
        if (selectedAd?.ad?.id === adId) fetchAdDetail(adId);
      } else {
        alert(data.error?.message || 'Unable to update listing status');
      }
    } catch (err) {
      console.error('Error updating ad status:', err);
    }
  };

  const handleBulkStatus = async () => {
    if (!selectedAdIds.length) return;
    const status = window.prompt('Enter target status (ACTIVE, REJECTED, ARCHIVED, SOLD):')?.trim().toUpperCase();
    if (!status || !window.confirm(`Apply ${status} to ${selectedAdIds.length} selected listings?`)) return;
    const reason = status === 'REJECTED' ? window.prompt('Enter the rejection reason (required):')?.trim() : undefined;
    if (status === 'REJECTED' && !reason) return;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
    const res = await fetch('/api/v1/admin/ads/bulk-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: selectedAdIds, status, rejectionReason: reason }),
    });
    const data = await res.json();
    if (!data.success) alert(data.error?.message || 'Bulk update failed');
    else { setSelectedAdIds([]); fetchAdminAds(); fetchAdminStats(); }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this listing?')) return;
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const res = await fetch(`/api/v1/admin/ads/${adId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchAdminAds();
        fetchAdminStats();
      }
    } catch (err) {
      console.error('Error deleting ad:', err);
    }
  };

  const handleModerationReview = async (adId: string, action: 'APPROVE' | 'REJECT') => {
    const reason = action === 'REJECT' ? window.prompt('Enter the rejection reason (required):')?.trim() : undefined;
    if (action === 'REJECT' && !reason) return;
    if (!window.confirm(action === 'APPROVE' ? 'Approve and publish this listing?' : 'Reject this listing with the supplied reason?')) return;
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const res = await fetch(`/api/v1/moderation/ads/${adId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          rejectionReason: reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchModerationQueue();
        fetchAdminStats();
      }
    } catch (err) {
      console.error('Error reviewing ad:', err);
    }
  };



  const flattenCategories = (nodes: any[], level = 0): any[] => nodes.flatMap((node) => [
    { ...node, level },
    ...(node.children?.length ? flattenCategories(node.children, level + 1) : []),
  ]);
  const startCategoryEdit = (category: any) => {
    setEditingCategoryId(category.id); setNewCatName(category.name || ''); setNewCatSlug(category.slug || ''); setNewCatDesc(category.description || ''); setNewCatIconUrl(category.iconUrl || ''); setNewCatDisplayOrder(String(category.displayOrder ?? 0)); setNewCatIsActive(Boolean(category.isActive)); setNewCatParentId(category.parentId || '');
  };
  const handleToggleCategoryActive = async (category: any) => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
    const res = await fetch(`/api/v1/categories/${category.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ isActive: !category.isActive }) });
    const data = await res.json(); if (!data.success) return alert(data.error?.message || 'Unable to update category'); fetchCategoryBuilderData();
  };
  const handleToggleLocationActive = async (location: any) => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
    const res = await fetch(`/api/v1/locations/${location.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ isActive: !location.isActive }) });
    const data = await res.json(); if (!data.success) return alert(data.error?.message || 'Unable to update location'); fetchLocationAdminData();
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setCreatingCategory(true);
    setCategorySuccess(false);

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const payload: any = {
        name: newCatName.trim(),
        slug: newCatSlug.trim() || undefined,
        description: newCatDesc.trim() || `${newCatName} marketplace category`,
        iconUrl: newCatIconUrl.trim() || undefined,
        isActive: newCatIsActive,
        displayOrder: Number(newCatDisplayOrder) || 0,
      };

      if (newCatParentId) {
        payload.parentId = newCatParentId;
      } else {
        payload.parentId = null;
      }

      const res = await fetch(editingCategoryId ? `/api/v1/categories/${editingCategoryId}` : '/api/v1/categories', {
        method: editingCategoryId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setCategorySuccess(true);
        setNewCatName('');
        setNewCatSlug('');
        setNewCatDesc('');
        setNewCatIconUrl('');
        setNewCatDisplayOrder('0');
        setNewCatIsActive(true);
        setNewCatParentId('');
        setEditingCategoryId('');
        fetchCategoryBuilderData();
        fetchAdminStats();
        if (onRefreshData) onRefreshData();
      } else {
        const errorMsg = data.error?.details
          ? data.error.details.map((d: any) => `${d.field ? `${d.field}: ` : ''}${d.issue}`).join('\n')
          : data.error?.message || 'Failed to save category';
        alert(errorMsg);
      }
    } catch {
      alert('Error creating category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (category: any) => {
    if (!window.confirm(`Are you sure you want to delete category "${category.name}"? If it has subcategories or active ads, it cannot be deleted.`)) {
      return;
    }
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('olx_access_token');
      const res = await fetch(`/api/v1/categories/${category.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        if (editingCategoryId === category.id) {
          setEditingCategoryId('');
          setNewCatName('');
          setNewCatSlug('');
          setNewCatDesc('');
          setNewCatIconUrl('');
          setNewCatDisplayOrder('0');
          setNewCatIsActive(true);
          setNewCatParentId('');
        }
        fetchCategoryBuilderData();
        fetchAdminStats();
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.error?.message || 'Failed to delete category');
      }
    } catch {
      alert('Error deleting category');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    setAdSearchQuery(globalSearch.trim());
    setActiveTab('ALL_ADS');
  };

  const formatPrice = (price?: number | string) => {
    if (!price) return '₹ --';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  const getCategoryIcon = (slugOrName: string) => {
    const s = slugOrName.toLowerCase();
    if (s.includes('car')) return <Car className="w-4 h-4 text-blue-400" />;
    if (s.includes('mobile') || s.includes('phone')) return <Smartphone className="w-4 h-4 text-cyan-400" />;
    if (s.includes('bike') || s.includes('motorcycle')) return <Bike className="w-4 h-4 text-emerald-400" />;
    if (s.includes('prop') || s.includes('house') || s.includes('flat')) return <Home className="w-4 h-4 text-amber-400" />;
    if (s.includes('elect') || s.includes('appliance')) return <Tv className="w-4 h-4 text-sky-400" />;
    if (s.includes('furn')) return <Armchair className="w-4 h-4 text-rose-400" />;
    if (s.includes('commercial') || s.includes('spare')) return <Truck className="w-4 h-4 text-slate-400" />;
    if (s.includes('fash') || s.includes('cloth')) return <Shirt className="w-4 h-4 text-purple-400" />;
    if (s.includes('book') || s.includes('sport') || s.includes('hobby')) return <BookOpen className="w-4 h-4 text-violet-400" />;
    if (s.includes('pet')) return <Dog className="w-4 h-4 text-teal-400" />;
    if (s.includes('serv')) return <Wrench className="w-4 h-4 text-yellow-400" />;
    if (s.includes('job')) return <Briefcase className="w-4 h-4 text-indigo-400" />;
    return <Layers className="w-4 h-4 text-slate-400" />;
  };

  const getCategoryBgColor = (slugOrName: string) => {
    const s = slugOrName.toLowerCase();
    if (s.includes('car')) return 'bg-blue-50 text-blue-600 border-blue-200';
    if (s.includes('mobile') || s.includes('phone')) return 'bg-cyan-50 text-cyan-600 border-cyan-200';
    if (s.includes('bike') || s.includes('motorcycle')) return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (s.includes('prop')) return 'bg-amber-50 text-amber-600 border-amber-200';
    if (s.includes('elect')) return 'bg-sky-50 text-sky-600 border-sky-200';
    if (s.includes('furn')) return 'bg-rose-50 text-rose-600 border-rose-200';
    if (s.includes('commercial')) return 'bg-slate-100 text-slate-700 border-slate-200';
    if (s.includes('fash')) return 'bg-purple-50 text-purple-600 border-purple-200';
    if (s.includes('book')) return 'bg-violet-50 text-violet-600 border-violet-200';
    if (s.includes('pet')) return 'bg-teal-50 text-teal-600 border-teal-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  // 12 Standard Categories Definition for grid
  const standardCategoriesList = [
    { name: 'Cars', slug: 'cars' },
    { name: 'Mobiles', slug: 'mobiles' },
    { name: 'Bikes', slug: 'bikes' },
    { name: 'Properties', slug: 'properties' },
    { name: 'Electronics & Appliances', slug: 'electronics-appliances' },
    { name: 'Furniture', slug: 'furniture' },
    { name: 'Commercial Vehicles', slug: 'commercial-cars' },
    { name: 'Fashion', slug: 'fashion' },
    { name: 'Books, Sports & Hobbies', slug: 'books-sports-hobbies' },
    { name: 'Pets', slug: 'pets' },
  ];

  // Helper to find count from real breakdown or fallback
  const getListingCountForCategory = (slug: string) => {
    const found = categoryBreakdown.find(
      (c) => c.slug?.toLowerCase() === slug.toLowerCase() || c.name?.toLowerCase().includes(slug.toLowerCase())
    );
    return found ? found.count : 0;
  };

  // Slices for Donut Chart
  const donutColors = ['#3B82F6', '#10B981', '#FFC439', '#06B6D4', '#8B5CF6', '#F97316'];
  const donutCategories = categoryBreakdown.filter((c) => c.count > 0).slice(0, 6);

  const totalDonutCount = donutCategories.reduce((sum, item) => sum + (item.count || 0), 0);

  // Compute SVG Donut Slices
  let accumulatedAngle = 0;
  const donutSlices = donutCategories.map((item, idx) => {
    const count = item.count || 1;
    const percentage = Math.round((count / totalDonutCount) * 100);
    const strokeDasharray = `${(count / totalDonutCount) * 283} 283`;
    const strokeDashoffset = -accumulatedAngle;
    accumulatedAngle += (count / totalDonutCount) * 283;
    return {
      name: item.name,
      count,
      percentage,
      color: donutColors[idx % donutColors.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  // Calculate SVG line points for Listings Trend Area Chart
  const chartWidth = 520;
  const chartHeight = 180;
  const chartPaddingTop = 20;
  const chartPaddingBottom = 30;
  const chartPaddingLeft = 35;
  const chartPaddingRight = 20;
  const effectiveWidth = chartWidth - chartPaddingLeft - chartPaddingRight;
  const effectiveHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
  const maxTrendVal = Math.max(1, ...trendData.map((point) => point.count));

  const points = trendData.map((p, idx, arr) => {
    const x = chartPaddingLeft + (arr.length === 1 ? 0 : idx / (arr.length - 1)) * effectiveWidth;
    const y = chartPaddingTop + effectiveHeight - (Math.min(p.count, maxTrendVal) / maxTrendVal) * effectiveHeight;
    return { x, y, point: p };
  });

  // Generate smooth SVG curve command
  const generateCurvedPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePathD = generateCurvedPath(points);
  const areaPathD =
    points.length > 0
      ? `${linePathD} L ${points[points.length - 1].x} ${chartPaddingTop + effectiveHeight} L ${points[0].x} ${
          chartPaddingTop + effectiveHeight
        } Z`
      : '';

  // ============================================================================
  // RENDER: LOGIN SCREEN (If not authenticated)
  // ============================================================================
  if (isCheckingSession) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${theme === 'dark' ? 'bg-[#F8FAFC] text-slate-900 ' : 'bg-[#F8FAFC] text-slate-800'}`}>
        <div className="flex items-center gap-2 text-sm text-slate-500" role="status">
          <RefreshCw className="h-4 w-4 animate-spin text-[#FFC439]" />
          Verifying admin session...
        </div>
      </div>
    );
  }

  if (!isAdminLoggedIn) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors ${
        theme === 'dark'
          ? 'bg-[#F8FAFC] text-slate-900 '
          : 'bg-gradient-to-br from-slate-50 via-slate-100 to-sky-50 text-slate-800'
      }`}>
        {/* Ambient glow orbs for cardmorphism backdrop */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#FFC439]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Theme switcher on Login Screen */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition flex items-center gap-2 text-xs font-semibold shadow-xs ${
              theme === 'dark'
                ? 'bg-white border-slate-200/80  text-[#FFC439] hover:bg-slate-50/80 '
                : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
            }`}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[#FFC439]" /> : <Moon className="w-4 h-4 text-slate-600" />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
          </button>
        </div>
        <div className={`w-full max-w-md rounded-3xl p-8 relative z-10 transition-all ${theme === 'dark' ? 'bg-white border border-slate-200/80  shadow-2xl backdrop-blur-md' : 'cardmorphism-elevated'}`}>
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-[#FFC439]/15 text-[#FFC439] rounded-2xl mb-3 border border-[#FFC439]/30">
              <Shield className="w-8 h-8" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-slate-900 ' : 'text-slate-900'}`}>OLX ORBIT</span>
              <span className="bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">
                ADMIN
              </span>
            </div>
            <p className={`text-xs mt-1.5 ${theme === 'dark' ? 'text-slate-500 ' : 'text-slate-500'}`}>
              Central Command & Operational Portal
            </p>
          </div>

          {loginError && (
            <div className="mb-5 p-3 rounded-lg bg-[#F43F5E]/20 border border-[#F43F5E]/50 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#F43F5E]" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Admin Username / Email
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin or admin@bharatmarket.in"
                className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition ${
                  theme === 'dark'
                    ? 'bg-slate-50/80  border border-slate-200/80  text-slate-900  focus:border-[#FFC439]'
                    : 'bg-slate-50/80 border border-slate-200 text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition ${
                  theme === 'dark'
                    ? 'bg-slate-50/80  border border-slate-200/80  text-slate-900  focus:border-[#FFC439]'
                    : 'bg-slate-50/80 border border-slate-200 text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                }`}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#FFC439] hover:bg-[#f0b52b] text-[#081426] font-extrabold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-[#FFC439]/20 cursor-pointer"
            >
              {isLoggingIn ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Enter Admin Console</span>
                </>
              )}
            </button>

            {/* Quick Demo Credentials Helper */}
            <button
              type="button"
              onClick={() => {
                setAdminUsername('admin');
                setAdminPassword('admin123');
              }}
              className={`w-full border text-xs py-2 rounded-xl transition cursor-pointer ${
                theme === 'dark'
                  ? 'border-slate-200/80  hover:bg-slate-50/80  text-slate-500  hover:text-slate-900 '
                  : 'border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Autofill Default Credentials (admin / admin123)
            </button>
          </form>

          {/* Exit to Public Website */}
          <div className={`mt-6 pt-5 border-t text-center ${theme === 'dark' ? 'border-slate-200/80 ' : 'border-slate-200'}`}>
            <button
              onClick={onExitToCustomerSite}
              className={`text-xs inline-flex items-center gap-1.5 transition cursor-pointer ${
                theme === 'dark' ? 'text-slate-500  hover:text-slate-900 ' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Return to Customer Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: REDESIGNED ENTERPRISE ADMIN CONSOLE (Light Cardmorphism Default)
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-[#FFC439] selection:text-[#081426]">
      <AdminConfirmDialog
        open={Boolean(pendingAction)}
        title="Change listing status?"
        description={pendingAction?.status === 'ACTIVE' ? 'This will publish the listing on the customer website.' : 'This sensitive moderation action will be audited.'}
        confirmLabel="Continue"
        onCancel={() => { setPendingAction(null); setRejectionReason(''); }}
        onConfirm={() => pendingAction && handleUpdateAdStatus(pendingAction.id, pendingAction.status, rejectionReason)}
      />
      {/* Top Admin App Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shadow-xs">
        {/* Left: Brand + Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsMobileSidebarOpen(!isMobileSidebarOpen);
              } else {
                setIsSidebarOpen(!isSidebarOpen);
              }
            }}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-slate-900 dark:hover:bg-white rounded-lg transition"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('DASHBOARD')}>
            <div className="w-7 h-7 rounded-lg bg-[#FFC439] flex items-center justify-center text-[#081426] font-black shadow-xs">
              <Shield className="w-4 h-4 fill-current" />
            </div>
            <span className="text-base font-black tracking-tight text-slate-900">
              OLX ORBIT
            </span>
            <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">
              ADMIN
            </span>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search listings, users, categories..."
              className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-14 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#FFC439] transition"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-white bg-slate-50 border border-slate-200/80 border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-400 text-slate-500 font-mono shadow-2xs">
              Ctrl K
            </div>
          </div>
        </form>

        {/* Right Actions: Theme Toggle, View Site, Notifications, Profile */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 border-slate-200 bg-white/80 hover:bg-slate-100 dark:hover:bg-slate-50/80 text-xs font-semibold text-slate-700 text-slate-900 transition shadow-2xs cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[#FFC439]" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            <span className="hidden lg:inline">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={onExitToCustomerSite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 border-slate-200 bg-white/80 hover:bg-slate-100 dark:hover:bg-slate-50/80 text-xs font-semibold text-slate-700 text-slate-900 transition shadow-2xs"
            title="Open Live Public Site"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">View Live Site</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-slate-900 dark:hover:bg-white rounded-xl transition relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#F43F5E] text-white text-[9px] font-bold flex items-center justify-center">
                {stats?.totalReports || 3}
              </span>
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 text-xs animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 border-slate-200">
                  <span className="font-bold text-slate-900">Notifications</span>
                  <span className="text-[10px] text-slate-500">Live Queue</span>
                </div>
                <div className="py-2 space-y-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 dark:border-transparent text-slate-600 text-slate-500 text-[11px]">
                    <span className="text-[#FFC439] font-bold">New pending ad:</span> Honda Activa 6G submitted for review.
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 dark:border-transparent text-slate-600 text-slate-500 text-[11px]">
                    <span className="text-[#10B981] font-bold">System Status:</span> All database nodes operational.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Admin Avatar & Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white transition text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 bg-slate-50 border border-slate-200 text-slate-800 text-slate-900 flex items-center justify-center font-bold text-xs shadow-2xs">
                {adminUser?.profile?.name?.[0] || 'R'}
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <div className="text-xs font-bold text-slate-900">
                  {adminUser?.profile?.name || 'Rahul Sharma'}
                </div>
                <div className="text-[10px] text-slate-500">Administrator</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 text-slate-500 hidden lg:block" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 text-xs animate-fadeIn">
                <div className="px-3 py-2 border-b border-slate-200/80 border-slate-200">
                  <p className="font-bold text-slate-900">{adminUser?.profile?.name || 'Rahul Sharma'}</p>
                  <p className="text-[10px] text-slate-500">{adminUser?.phoneNumber || '+91 99999 88888'}</p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('MODERATION');
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-slate-500 dark:hover:text-slate-900 dark:hover:bg-slate-50/80 transition flex items-center gap-2"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Moderation Queue</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('SETTINGS');
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-slate-500 dark:hover:text-slate-900 dark:hover:bg-slate-50/80 transition flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Admin Settings</span>
                </button>
                <div className="border-t border-slate-200/80 border-slate-200 my-1" />
                <button
                  onClick={handleAdminLogout}
                  className="w-full text-left px-3 py-2 text-[#F43F5E] hover:bg-[#F43F5E]/10 transition flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Sidebar Overlay & Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-xs"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <aside className="relative w-72 bg-white/95 bg-slate-50 border-r border-slate-200/80 border-slate-200 p-4 flex flex-col justify-between z-10 animate-slideIn backdrop-blur-md">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#FFC439] flex items-center justify-center text-[#081426] font-black">
                      <Shield className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <span className="font-bold text-sm text-slate-900">OLX ORBIT Admin</span>
                  </div>
                  <button
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-1 text-slate-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <nav className="space-y-1">
                  {([
                    { id: 'DASHBOARD', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
                    { id: 'CATEGORIES', label: 'Categories & Specs', icon: <Layers className="w-4 h-4" /> },
                    { id: 'ALL_ADS', label: 'Manage All Ads', icon: <Tag className="w-4 h-4" /> },
                    { id: 'USERS', label: 'Users Management', icon: <Users className="w-4 h-4" /> },
                    { id: 'ANALYTICS', label: 'Reports & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
                    { id: 'MESSAGES', label: 'Comments & Messages', icon: <MessageSquare className="w-4 h-4" /> },
                    { id: 'SETTINGS', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
                  ] as Array<{ id: string; label: string; icon: React.ReactNode; badge?: number | string }>).filter((item) => isAdmin || !['USERS', 'SETTINGS'].includes(item.id)).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                        activeTab === item.id
                          ? 'bg-[#FFC439] text-[#081426] font-bold shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-slate-500  dark:hover:bg-white dark:hover:text-slate-900 '
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="w-4 h-4 rounded-full bg-[#F43F5E] text-white text-[9px] font-bold flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="pt-4 border-t border-slate-200/80 mt-auto">
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Logout</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Left Navigation Sidebar - Sticky so it never scrolls away */}
        <aside
          className={`${
            isSidebarOpen ? 'w-60' : 'w-16'
          } bg-white/90 bg-slate-50 border-r border-slate-200/80 border-slate-200 p-3 flex flex-col justify-between flex-shrink-0 transition-all duration-300 hidden md:flex backdrop-blur-md sticky top-[53px] h-[calc(100vh-53px)] self-start overflow-y-auto z-20`}
        >
          <div className="space-y-4">
            {isSidebarOpen && (
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-slate-500 px-3 pt-2">
                MAIN MENU
              </div>
            )}

            <nav className="space-y-1">
              {/* 1. Dashboard Overview */}
              <button
                onClick={() => setActiveTab('DASHBOARD')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'DASHBOARD'
                    ? 'bg-[#FFC439] text-[#081426] shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-slate-500  dark:hover:bg-white dark:hover:text-slate-900 '
                }`}
                title="Dashboard Overview"
              >
                <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                {isSidebarOpen && <span>Dashboard Overview</span>}
              </button>

              {/* 2. Categories & Specs */}
              <button
                onClick={() => setActiveTab('CATEGORIES')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'CATEGORIES'
                    ? 'bg-[#FFC439] text-[#081426] font-bold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-slate-500  dark:hover:bg-white dark:hover:text-slate-900 '
                }`}
                title="Categories & Specs"
              >
                <Layers className="w-4 h-4 flex-shrink-0" />
                {isSidebarOpen && <span>Categories & Specs</span>}
              </button>

              {/* 4. Manage All Ads */}
              <button
                onClick={() => setActiveTab('ALL_ADS')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'ALL_ADS'
                    ? 'bg-[#FFC439] text-[#081426] font-bold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-slate-500  dark:hover:bg-white dark:hover:text-slate-900 '
                }`}
                title="Manage All Ads"
              >
                <Tag className="w-4 h-4 flex-shrink-0" />
                {isSidebarOpen && <span>Manage All Ads</span>}
              </button>

              {/* 5. Users Management */}
              <button
                onClick={() => setActiveTab('USERS')}
                className={`${!isAdmin ? 'hidden' : ''} w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'USERS'
                    ? 'bg-[#FFC439] text-[#081426] font-bold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-slate-500  dark:hover:bg-white dark:hover:text-slate-900 '
                }`}
                title="Users Management"
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                {isSidebarOpen && <span>Users Management</span>}
              </button>

              {/* 6. Reports & Analytics */}
              <button
                onClick={() => setActiveTab('ANALYTICS')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'ANALYTICS'
                    ? 'bg-[#FFC439] text-[#081426] font-bold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-slate-500  dark:hover:bg-white dark:hover:text-slate-900 '
                }`}
                title="Reports & Analytics"
              >
                <BarChart3 className="w-4 h-4 flex-shrink-0" />
                {isSidebarOpen && <span>Reports & Analytics</span>}
              </button>

              {/* 7. Comments & Messages */}
              <button
                onClick={() => setActiveTab('MESSAGES')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'MESSAGES'
                    ? 'bg-[#FFC439] text-[#081426] font-bold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-slate-500  dark:hover:bg-white dark:hover:text-slate-900 '
                }`}
                title="Comments & Messages"
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                {isSidebarOpen && <span>Comments & Messages</span>}
              </button>

              {/* 8. Settings */}
              <button
                onClick={() => setActiveTab('SETTINGS')}
                className={`${!isAdmin ? 'hidden' : ''} w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'SETTINGS'
                    ? 'bg-[#FFC439] text-[#081426] font-bold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-slate-500  dark:hover:bg-white dark:hover:text-slate-900 '
                }`}
                title="Settings"
              >
                <Settings className="w-4 h-4 flex-shrink-0" />
                {isSidebarOpen && <span>Settings</span>}
              </button>
            </nav>
          </div>

          {/* Left Sidebar Logout Button */}
          <div className="mt-auto pt-3 border-t border-slate-200/80">
            <button
              type="button"
              onClick={handleAdminLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200/80 transition cursor-pointer shadow-xs group"
              title="Logout"
            >
              <LogOut className="w-4 h-4 flex-shrink-0 text-rose-500 group-hover:-translate-x-0.5 transition-transform" />
              {isSidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Right Main Content Scroll Container */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-[1600px] mx-auto w-full">
          {/* ================================================================== */}
          {/* TAB 1: DASHBOARD OVERVIEW (Pixel-Perfect Match to Reference) */}
          {/* ================================================================== */}
          {activeTab === 'DASHBOARD' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Title & Date / Refresh Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Dashboard Overview
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Welcome back! Here's what's happening with your marketplace today.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 bg-white/80 border border-slate-200/80 border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 text-slate-900 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <label className="sr-only" htmlFor="admin-date-from">From</label>
                    <input
                      id="admin-date-from"
                      type="date"
                      value={dateFrom}
                      onChange={(event) => setDateFrom(event.target.value)}
                      className="bg-transparent text-xs text-slate-900 outline-none"
                    />
                    <span className="text-slate-500">to</span>
                    <label className="sr-only" htmlFor="admin-date-to">To</label>
                    <input
                      id="admin-date-to"
                      type="date"
                      value={dateTo}
                      onChange={(event) => setDateTo(event.target.value)}
                      className="bg-transparent text-xs text-slate-900 outline-none"
                    />
                  </div>

                  <button
                    onClick={fetchAdminStats}
                    className="flex items-center gap-2 bg-[#FFC439] hover:bg-[#f0b52b] text-[#081426] px-3.5 py-2 rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
                    <span>Refresh Data</span>
                  </button>
                </div>
              </div>

              {statsError && <AdminErrorState message={statsError} onAction={fetchAdminStats} />}

              {/* 4 Responsive KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Active Listings */}
                <div className="cardmorphism rounded-2xl p-4 shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-semibold text-slate-500 block">Active Listings</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-slate-900">
                        {stats?.activeAds ?? '—'}
                      </span>
                    </div>
                  </div>
                  {/* Sparkline decoration */}
                  <svg className="w-24 h-8 absolute right-3 bottom-3 stroke-[#10B981] fill-none" viewBox="0 0 100 35">
                    <path d="M 0,25 Q 25,30 45,15 T 75,10 T 100,2" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <div className="text-[11px] text-slate-500 mt-2">
                    Total {stats?.totalAds ?? '—'} in catalog
                  </div>
                </div>

                {/* KPI 2: Categories */}
                <div className="cardmorphism rounded-2xl p-4 shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-semibold text-slate-500 block">Categories</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-slate-900">
                        {stats?.totalCategories ?? '—'}
                      </span>
                    </div>
                  </div>
                  <svg className="w-24 h-8 absolute right-3 bottom-3 stroke-[#3B82F6] fill-none" viewBox="0 0 100 35">
                    <path d="M 0,28 Q 20,20 40,25 T 70,12 T 100,5" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <div className="text-[11px] text-slate-500 mt-2">
                    Cars, Bikes, Mobiles & more
                  </div>
                </div>

                {/* KPI 3: Registered Users */}
                <div className="cardmorphism rounded-2xl p-4 shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-semibold text-slate-500 block">Registered Users</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-slate-900">
                        {stats?.totalUsers ?? '—'}
                      </span>
                    </div>
                  </div>
                  <svg className="w-24 h-8 absolute right-3 bottom-3 stroke-[#8B5CF6] fill-none" viewBox="0 0 100 35">
                    <path d="M 0,26 Q 30,30 50,18 T 80,10 T 100,3" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <div className="text-[11px] text-slate-500 mt-2">
                    Verified Indian mobiles
                  </div>
                </div>

                {/* KPI 4: Fraud Alerts */}
                <div className="cardmorphism rounded-2xl p-4 shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-semibold text-slate-500 block">Fraud Alerts</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-slate-900">
                        {stats?.totalReports ?? '—'}
                      </span>
                    </div>
                  </div>
                  <svg className="w-24 h-8 absolute right-3 bottom-3 stroke-[#F43F5E] fill-none" viewBox="0 0 100 35">
                    <path d="M 0,8 Q 30,5 50,15 T 80,22 T 100,28" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <div className="text-[11px] text-slate-500 mt-2">
                    {stats?.totalReports ?? '—'} user complaints
                  </div>
                </div>
              </div>

              {/* Analytics & Quick Actions Section (3 Cards) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* 1. Listings Trend Chart (approx 45% width) */}
                <div className="lg:col-span-5 cardmorphism rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#3B82F6]" />
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        Listings Trend <span className="text-slate-500 font-normal text-[11px]">(Last 30 Days)</span>
                      </h3>
                    </div>
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg px-2 py-1 text-[11px] text-slate-500 flex items-center gap-1">
                      <span>Last 30 Days</span>
                      <ChevronDown className="w-3 h-3" />
                    </div>
                  </div>

                  {/* SVG Area Chart */}
                  <div className="relative w-full h-[180px] mt-2">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Dotted Y-Axis Grid Lines */}
                      {[0, 5, 10, 15, 20].map((val) => {
                        const y = chartPaddingTop + effectiveHeight - (val / maxTrendVal) * effectiveHeight;
                        return (
                          <g key={val}>
                            <text
                              x={chartPaddingLeft - 8}
                              y={y + 3}
                              textAnchor="end"
                              className="text-[9px] fill-slate-400 font-mono"
                            >
                              {val}
                            </text>
                            <line
                              x1={chartPaddingLeft}
                              y1={y}
                              x2={chartWidth - chartPaddingRight}
                              y2={y}
                              stroke="#E2E8F0"
                              strokeDasharray="2,3"
                              strokeWidth="1"
                            />
                          </g>
                        );
                      })}

                      {/* Area Fill */}
                      {areaPathD && <path d={areaPathD} fill="url(#trendGradient)" />}

                      {/* Smooth Line Path */}
                      {linePathD && (
                        <path
                          d={linePathD}
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      )}

                      {/* Data Point Dots */}
                      {points.map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPoint?.point.date === pt.point.date ? 5 : 3.5}
                          fill="#3B82F6"
                          stroke="#F4F7FB"
                          strokeWidth="1.5"
                          className="cursor-pointer transition-all hover:scale-125"
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      ))}

                      {/* X-Axis Labels */}
                      {points.map((pt, idx) => (
                        <text
                          key={idx}
                          x={pt.x}
                          y={chartHeight - 8}
                          textAnchor="middle"
                          className="text-[9px] fill-slate-400"
                        >
                          {pt.point.date}
                        </text>
                      ))}
                    </svg>

                    {/* Hover Tooltip */}
                    {hoveredPoint && (
                      <div
                        className="absolute bg-slate-50/80 border border-slate-200/80 px-2 py-1 rounded text-[10px] text-white shadow pointer-events-none transform -translate-x-1/2 -translate-y-8"
                        style={{ left: `${(hoveredPoint.x / chartWidth) * 100}%`, top: `${hoveredPoint.y}px` }}
                      >
                        <span className="font-bold text-[#FFC439]">{hoveredPoint.point.count} ads</span> on {hoveredPoint.point.date}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Listings by Category Donut Chart (approx 35% width) */}
                <div className="lg:col-span-4 cardmorphism rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-2">
                    Listings by Category
                  </h3>

                  <div className="flex items-center justify-between gap-4">
                    {/* SVG Donut */}
                    <div className="relative w-32 h-32 flex-shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {donutSlices.map((slice, i) => (
                          <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="14"
                            strokeDasharray={slice.strokeDasharray}
                            strokeDashoffset={slice.strokeDashoffset}
                            className="transition-all hover:opacity-85"
                          />
                        ))}
                      </svg>
                      {/* Center total */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-base font-black text-slate-900 leading-none">
                          {stats ? stats.activeAds : 11}
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                          Total
                        </span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="flex-1 space-y-1.5 text-xs">
                      {donutSlices.map((slice, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: slice.color }}
                            />
                            <span className="text-slate-500 truncate">{slice.name}</span>
                          </div>
                          <span className="font-semibold text-slate-900 flex-shrink-0 ml-1">
                            {slice.count} ({slice.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Quick Actions Panel (approx 20% width) */}
                <div className="lg:col-span-3 cardmorphism rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles className="w-4 h-4 text-[#FFC439]" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Quick Actions</h3>
                  </div>

                  <div className="space-y-2">
                    {/* Primary Action Button: Create Category */}
                    <button
                      onClick={() => {
                        setEditingCategoryId('');
                        setNewCatParentId('');
                        setNewCatName('');
                        setNewCatSlug('');
                        setNewCatDesc('');
                        setNewCatIconUrl('');
                        setNewCatDisplayOrder(String(categoryTree.length + 1));
                        setNewCatIsActive(true);
                        setActiveTab('CATEGORIES');
                      }}
                      className="w-full bg-[#FFC439] hover:bg-[#f0b52b] text-[#081426] font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>Create Category (Cars, Bikes, etc.)</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('MODERATION')}
                      className="w-full bg-slate-50/80 hover:bg-slate-100 dark:hover:bg-slate-100 border border-slate-200/80 text-slate-900 font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">Manage Pending Ads</span>
                      </div>
                      <span className="bg-[#F43F5E] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {stats?.pendingAds ?? '—'}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('MODERATION')}
                      className="w-full bg-slate-50/80 hover:bg-slate-100 dark:hover:bg-slate-100 border border-slate-200/80 text-slate-900 font-semibold py-2 px-3 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-[#10B981]" />
                      <span className="truncate">Open Moderation Queue</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('MODERATION')}
                      className="w-full bg-slate-50/80 hover:bg-slate-100 dark:hover:bg-slate-100 border border-slate-200/80 text-slate-900 font-semibold py-2 px-3 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      <span className="truncate">View Reports</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Wise Listings Section */}
              <div className="cardmorphism rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-[#FFC439]" />
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                      Category Wise Listings
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => {
                        setEditingCategoryId('');
                        setNewCatParentId('');
                        setNewCatName('');
                        setNewCatSlug('');
                        setNewCatDesc('');
                        setNewCatIconUrl('');
                        setNewCatDisplayOrder(String(categoryTree.length + 1));
                        setNewCatIsActive(true);
                        setActiveTab('CATEGORIES');
                      }}
                      className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300/80 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Add Category</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('CATEGORIES')}
                      className="text-xs text-[#3B82F6] hover:text-blue-500 font-semibold flex items-center gap-1 transition"
                    >
                      <span>View All Categories</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2 Rows of 5 Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {standardCategoriesList.map((cat) => {
                    const count = getListingCountForCategory(cat.slug);
                    return (
                      <div
                        key={cat.slug}
                        onClick={() => {
                          setSelectedCategoryFilter(cat.name);
                          setActiveTab('ALL_ADS');
                        }}
                        className="bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${getCategoryBgColor(
                              cat.name
                            )}`}
                          >
                            {getCategoryIcon(cat.name)}
                          </div>
                          <div className="min-w-0 truncate">
                            <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-[#FFC439] transition">
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {count} {count === 1 ? 'listing' : 'listings'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-900 flex-shrink-0 ml-1 transition" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Operational analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 cardmorphism rounded-2xl p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900">User Registration Trend</h2>
                    <span className="text-[10px] text-slate-500">Selected date range</span>
                  </div>
                  {userTrendData.length === 0 ? (
                    <AdminEmptyState message="No registrations in this range. Try a wider date range." />
                  ) : (
                    <div className="flex items-end gap-1 h-32">
                      {userTrendData.map((point) => {
                        const max = Math.max(1, ...userTrendData.map((item) => item.count));
                        return (
                          <div key={point.date} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                            <span className="text-[9px] text-slate-500">{point.count}</span>
                            <div
                              className="w-full max-w-6 rounded-t bg-[#8B5CF6]"
                              style={{ height: `${Math.max(4, (point.count / max) * 90)}%` }}
                              title={`${point.date}: ${point.count}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="cardmorphism rounded-2xl p-4 sm:p-5 shadow-xs">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 mb-3">City-wise Inventory</h2>
                  {cityBreakdown.length === 0 ? (
                    <AdminEmptyState message="No location data. Listings without a location are excluded." />
                  ) : (
                    <div className="space-y-2">
                      {cityBreakdown.map((city) => (
                        <div key={city.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 truncate">{city.name}</span>
                          <span className="font-bold text-slate-900">{city.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="cardmorphism rounded-2xl p-4 sm:p-5 shadow-xs">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 mb-3">Pending Moderation</h2>
                  {pendingQueue.length === 0 ? (
                    <AdminEmptyState message="Queue is clear. No listings require review." />
                  ) : (
                    <div className="space-y-2">
                      {pendingQueue.map((ad) => (
                        <div key={ad.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-500 truncate">{ad.title}</span>
                          <AdminStatusBadge status="PENDING" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="cardmorphism rounded-2xl p-4 sm:p-5 shadow-xs">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 mb-3">Recent Reports</h2>
                  {recentReports.length === 0 ? (
                    <AdminEmptyState message="No recent reports. Reported content will appear here." />
                  ) : (
                    <div className="space-y-2">
                      {recentReports.map((report) => (
                        <div key={report.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-500 truncate">{report.reason || 'Reported listing'}</span>
                          <AdminStatusBadge status={report.status || 'OPEN'} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="cardmorphism rounded-2xl p-4 sm:p-5 shadow-xs">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 mb-3">Recent Admin Activity</h2>
                  {recentActivity.length === 0 ? (
                    <AdminEmptyState message="No activity recorded. Admin actions will appear here." />
                  ) : (
                    <div className="space-y-2">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="text-xs">
                          <span className="text-slate-900">{activity.action}</span>
                          <span className="text-slate-500 block truncate">{activity.entityType || 'System'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recently Added Items Table */}
              <div className="cardmorphism rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                      Recently Added Items
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('ALL_ADS')}
                    className="text-xs text-[#FFC439] hover:underline font-semibold flex items-center gap-1 transition"
                  >
                    <span>View All {stats?.totalAds ?? '—'} Ads</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">TITLE & ITEM</th>
                        <th className="py-2.5 px-3">CATEGORY</th>
                        <th className="py-2.5 px-3">PRICE (₹)</th>
                        <th className="py-2.5 px-3">LOCATION</th>
                        <th className="py-2.5 px-3">DATE</th>
                        <th className="py-2.5 px-3">STATUS</th>
                        <th className="py-2.5 px-3 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentAds.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">
                            No listings found. Post your first ad above!
                          </td>
                        </tr>
                      ) : (
                        recentAds.map((ad, idx) => {
                          const thumb =
                            ad.images?.[0]?.displayUrl ||
                            ad.images?.[0]?.url ||
                            'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100';

                          const isHighValue = Number(ad.price) > 500000;

                          return (
                            <tr
                              key={ad.id}
                              className="hover:bg-slate-50/80 /60 transition group"
                            >
                              <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                                {idx + 1}
                              </td>

                              {/* Title & Item with Thumbnail */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-slate-200/80"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 truncate max-w-xs group-hover:text-[#FFC439] transition">
                                        {ad.title}
                                      </span>
                                      {isHighValue && (
                                        <span className="bg-[#FFC439] text-[#081426] text-[9px] font-black uppercase px-1.5 py-0.2 rounded">
                                          FEATURED
                                        </span>
                                      )}
                                      {!isHighValue && (
                                        <span className="bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded">
                                          ✓ VERIFIED
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-3 px-3 text-slate-500">
                                {ad.category?.name || 'Classifieds'}
                              </td>

                              {/* Price */}
                              <td className="py-3 px-3 font-bold text-slate-900">
                                {formatPrice(ad.price)}
                              </td>

                              {/* Location */}
                              <td className="py-3 px-3 text-slate-500">
                                {ad.location?.name || 'All India'}
                              </td>

                              {/* Date */}
                              <td className="py-3 px-3 text-slate-500 text-[11px]">
                                {new Date(ad.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3">
                                <span className="bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                                  {ad.status === 'PENDING_REVIEW' ? 'Pending' : 'Active'}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setActiveTab('ALL_ADS');
                                    }}
                                    className="p-1.5 hover:bg-slate-50/80 rounded-lg text-slate-500 hover:text-slate-900 transition"
                                    title="Edit Listing"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      window.open(`/?ad=${ad.id}`, '_blank');
                                    }}
                                    className="p-1.5 hover:bg-slate-50/80 rounded-lg text-slate-500 hover:text-slate-900 transition"
                                    title="View Live Listing"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAd(ad.id)}
                                    className="p-1.5 hover:bg-slate-50/80 rounded-lg text-slate-500 hover:text-[#F43F5E] transition"
                                    title="Delete Listing"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}



          {/* ================================================================== */}
          {/* TAB 3: CATEGORIES & SPECS */}
          {/* ================================================================== */}
          {activeTab === 'CATEGORIES' && (
            <div className="space-y-6 animate-fadeIn">
              <AdminPageHeader
                title="Category Builder & Navigation Ribbon"
                description="Manage the top navigation ribbon categories (Cars, Mobiles, Bikes, Properties...) and create nested subcategories with dynamic specifications."
              />

              {/* LIVE PREVIEW: Customer Top Header Ribbon */}
              <div className="cardmorphism p-5 rounded-2xl shadow-xs space-y-3 border-l-4 border-l-[#FFC439]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#FFC439]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Live Preview: Top Navigation Ribbon (Customer Header)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Customer website ke top header par yahi categories live show hoti hain. Root categories (Parent = None) auto yahan aati hain.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] bg-amber-50 text-amber-900 font-bold px-2.5 py-1 rounded-full border border-amber-200 w-fit">
                      {categoryTree.filter((c: any) => !c.parentId && c.isActive !== false).length} Ribbon Categories
                    </span>
                    <button
                      type="button"
                      onClick={fetchCategoryBuilderData}
                      className="text-xs text-[#3B82F6] hover:text-blue-600 font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white"
                    >
                      Refresh Tree
                    </button>
                  </div>
                </div>

                {/* Simulated Customer Ribbon */}
                <div className="bg-white rounded-xl border border-slate-200 p-2.5 flex items-center gap-2 overflow-x-auto shadow-inner no-scrollbar text-xs">
                  <div className="flex items-center gap-1 font-bold text-[#102A33] px-2.5 py-1 bg-slate-100 rounded-md whitespace-nowrap text-[11px] flex-shrink-0">
                    <span>ALL CATEGORIES</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="h-4 w-[1px] bg-slate-200 flex-shrink-0" />
                  {categoryTree
                    .filter((c: any) => !c.parentId && c.isActive !== false)
                    .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                    .map((cat: any) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => startCategoryEdit(cat)}
                        title={`Click to edit "${cat.name}"`}
                        className="flex-shrink-0 px-2.5 py-1 rounded-md text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition text-[11px] font-medium flex items-center gap-1.5"
                      >
                        <span>{cat.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono">#{cat.displayOrder ?? 0}</span>
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId('');
                      setNewCatName('');
                      setNewCatSlug('');
                      setNewCatDesc('');
                      setNewCatParentId('');
                      setNewCatIconUrl('');
                      setNewCatDisplayOrder(String(categoryTree.filter((c) => !c.parentId).length + 1));
                      setNewCatIsActive(true);
                    }}
                    className="flex-shrink-0 px-2.5 py-1 rounded-md text-amber-700 hover:bg-amber-50 border border-dashed border-amber-300 font-bold text-[11px] flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3 text-amber-600" />
                    <span>+ New Ribbon Item</span>
                  </button>
                </div>
              </div>

              {categorySuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-medium">
                      {editingCategoryId ? 'Category updated successfully!' : 'Category created successfully and added to the marketplace!'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategorySuccess(false)}
                    className="text-[11px] text-emerald-700 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form: Create or Edit Category */}
                <form onSubmit={handleCreateCategory} className="cardmorphism p-5 rounded-2xl space-y-4 shadow-xs h-fit">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <LayoutGrid className="w-3.5 h-3.5 text-[#FFC439]" />
                      <span>{editingCategoryId ? 'Edit Category' : 'Create Category'}</span>
                    </h3>
                    {editingCategoryId && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                        Editing
                      </span>
                    )}
                  </div>

                  {/* Ribbon vs Subcategory selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                      Placement in Marketplace
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewCatParentId('')}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          !newCatParentId
                            ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Main Top Ribbon</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-normal mt-0.5">Top bar me direct dikhegi</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCatParentId && categoryTree.length > 0) {
                            setNewCatParentId(categoryTree[0]?.id || '');
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          newCatParentId
                            ? 'bg-blue-50/90 border-blue-300 text-blue-950 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs">
                          <Layers className="w-3.5 h-3.5 text-blue-500" />
                          <span>Subcategory</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-normal mt-0.5">Under parent category</p>
                      </button>
                    </div>
                  </div>

                  {newCatParentId ? (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">Parent Category</label>
                      <select
                        value={newCatParentId}
                        onChange={(event) => setNewCatParentId(event.target.value)}
                        className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900"
                        required
                      >
                        <option value="">-- Select Parent Category --</option>
                        {flattenCategories(categoryTree).filter((row) => row.id !== editingCategoryId).map((row) => (
                          <option key={row.id} value={row.id}>{`${'—'.repeat(row.level)} ${row.name}`}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-900 text-[11px] flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>Ye category top header ribbon me show hogi.</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Category Name *</label>
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(event) => {
                        setNewCatName(event.target.value);
                        if (!editingCategoryId && !newCatSlug) {
                          setNewCatSlug(
                            event.target.value
                              .toLowerCase()
                              .trim()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/(^-|-$)/g, '')
                          );
                        }
                      }}
                      placeholder="e.g. Electric Vehicles, Pets, Jobs..."
                      className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">URL Slug</label>
                    <input
                      type="text"
                      value={newCatSlug}
                      onChange={(event) => setNewCatSlug(event.target.value)}
                      placeholder="e.g. electric-vehicles (optional auto)"
                      className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">Display Order</label>
                      <input
                        type="number"
                        value={newCatDisplayOrder}
                        onChange={(event) => setNewCatDisplayOrder(event.target.value)}
                        placeholder="0, 1, 2..."
                        className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">Icon / URL</label>
                      <input
                        type="text"
                        value={newCatIconUrl}
                        onChange={(event) => setNewCatIconUrl(event.target.value)}
                        placeholder="e.g. Car, Smartphone..."
                        className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Description</label>
                    <input
                      type="text"
                      value={newCatDesc}
                      onChange={(event) => setNewCatDesc(event.target.value)}
                      placeholder="Category description or tagline"
                      className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={newCatIsActive}
                      onChange={(event) => setNewCatIsActive(event.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span>Active & Visible in Ribbon / Search</span>
                  </label>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={creatingCategory}
                      className="flex-1 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer"
                    >
                      {creatingCategory ? 'Saving...' : editingCategoryId ? 'Update Category' : 'Create Category'}
                    </button>
                    {editingCategoryId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId('');
                          setNewCatName('');
                          setNewCatSlug('');
                          setNewCatDesc('');
                          setNewCatParentId('');
                          setNewCatIconUrl('');
                          setNewCatDisplayOrder('0');
                          setNewCatIsActive(true);
                        }}
                        className="rounded-xl border border-slate-200/80 px-3 py-2 text-xs text-slate-500 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {/* Category Tree & Management List */}
                <div className="lg:col-span-2 cardmorphism p-5 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#3B82F6]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Category Tree ({flattenCategories(categoryTree).length})
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          placeholder="Filter categories..."
                          className="bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 w-44"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={fetchCategoryBuilderData}
                        className="text-xs text-[#3B82F6] hover:text-blue-600 font-semibold px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  {categoryBuilderLoading ? (
                    <AdminLoadingState message="Loading category tree..." />
                  ) : (
                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {flattenCategories(categoryTree)
                        .filter((cat) => {
                          if (!categorySearchQuery.trim()) return true;
                          const q = categorySearchQuery.toLowerCase();
                          return (
                            cat.name.toLowerCase().includes(q) ||
                            (cat.slug && cat.slug.toLowerCase().includes(q))
                          );
                        })
                        .map((category) => {
                          const isRoot = !category.parentId;
                          return (
                            <div
                              key={category.id}
                              className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                                editingCategoryId === category.id
                                  ? 'bg-blue-50/90 border-blue-300'
                                  : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/80'
                              }`}
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                {category.level > 0 && (
                                  <span className="text-slate-400 font-mono text-xs">
                                    {'—'.repeat(category.level)}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {category.name}
                                    </p>
                                    {isRoot && (
                                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                                        Top Ribbon
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-500 font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                      Order: {category.displayOrder ?? 0}
                                    </span>
                                    {!category.isActive && (
                                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                        Disabled
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                                    /{category.slug}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startCategoryEdit(category)}
                                  className="text-[11px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-slate-700 font-medium transition"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCategoryActive(category)}
                                  className={`text-[11px] rounded-lg border px-2.5 py-1 font-medium transition ${
                                    category.isActive
                                      ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  }`}
                                >
                                  {category.isActive ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(category)}
                                  className="text-[11px] rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 px-2.5 py-1 font-medium transition flex items-center gap-1"
                                  title="Delete Category"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleCategoryAttributeCreate} className="cardmorphism p-5 rounded-2xl space-y-3 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFC439]">Dynamic attribute builder</h3>
                  <select value={attributeCategoryId} onChange={(event) => setAttributeCategoryId(event.target.value)} className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" required>
                    <option value="">Select category</option>
                    {flattenCategories(categoryTree).map((row) => (
                      <option key={row.id} value={row.id}>{`${'—'.repeat(row.level)} ${row.name}`}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={attributeName} onChange={(event) => setAttributeName(event.target.value)} placeholder="Name (Brand)" className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" required />
                    <input type="text" value={attributeKey} onChange={(event) => setAttributeKey(event.target.value)} placeholder="Key (brand)" className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={attributeLabel} onChange={(event) => setAttributeLabel(event.target.value)} placeholder="Display label" className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" />
                    <select value={attributeType} onChange={(event) => setAttributeType(event.target.value)} className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900">
                      {['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'DATE'].map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <input type="text" value={attributeOptions} onChange={(event) => setAttributeOptions(event.target.value)} placeholder="Allowed values (comma separated for select types)" className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" />
                  <input type="text" value={attributeUnit} onChange={(event) => setAttributeUnit(event.target.value)} placeholder="Unit (KM, sqft...)" className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" />
                  <textarea value={attributeValidation} onChange={(event) => setAttributeValidation(event.target.value)} placeholder='Validation JSON (example: {"min":0,"max":1000000})' className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900 min-h-[72px]" />
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <input type="number" value={attributeDisplayOrder} onChange={(event) => setAttributeDisplayOrder(event.target.value)} placeholder="Order" className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" />
                    <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={attributeRequired} onChange={(event) => setAttributeRequired(event.target.checked)} /> Required</label>
                    <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={attributeFilterable} onChange={(event) => setAttributeFilterable(event.target.checked)} /> Filterable</label>
                  </div>
                  <button type="submit" disabled={addingAttribute} className="w-full rounded-xl bg-[#3B82F6] px-3 py-2 text-xs font-bold text-white">{addingAttribute ? 'Adding...' : 'Add attribute'}</button>
                </form>

                <div className="cardmorphism p-5 rounded-2xl space-y-3 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Location management</h3>
                  <form onSubmit={handleLocationCreate} className="space-y-2">
                    <input type="text" value={newLocationName} onChange={(event) => setNewLocationName(event.target.value)} placeholder="Location name" className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" required />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={newLocationSlug} onChange={(event) => setNewLocationSlug(event.target.value)} placeholder="Slug (optional auto)" className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" />
                      <select value={newLocationType} onChange={(event) => setNewLocationType(event.target.value)} className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900">
                        {['COUNTRY', 'STATE', 'CITY', 'LOCALITY'].map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>
                    <select value={newLocationParentId} onChange={(event) => setNewLocationParentId(event.target.value)} className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900">
                      <option value="">Parent location</option>
                      {locationTree.map((location) => <option key={location.id} value={location.id}>{`${location.type} · ${location.name}`}</option>)}
                    </select>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" value={newLocationPincode} onChange={(event) => setNewLocationPincode(event.target.value)} placeholder="Pincode" className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" />
                      <input type="number" step="0.000001" value={newLocationLat} onChange={(event) => setNewLocationLat(event.target.value)} placeholder="Latitude" className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" required />
                      <input type="number" step="0.000001" value={newLocationLng} onChange={(event) => setNewLocationLng(event.target.value)} placeholder="Longitude" className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" required />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={newLocationIsActive} onChange={(event) => setNewLocationIsActive(event.target.checked)} /> Active</label>
                      <button type="submit" disabled={creatingLocation} className="rounded-xl bg-[#3B82F6] px-4 py-2 text-xs font-bold text-white">{creatingLocation ? 'Saving...' : 'Create location'}</button>
                    </div>
                  </form>
                  <div className="flex gap-2">
                    <input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Search city/locality/pincode" className="flex-1 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900" />
                    <button onClick={fetchLocationAdminData} className="rounded-xl border border-slate-200/80 px-3 py-2 text-xs text-slate-500">Search</button>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto space-y-2">
                    {locationTree.map((location) => (
                      <div key={location.id} className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2 text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-slate-900 truncate">{location.name} <span className="text-slate-500">({location.type})</span></p>
                          <p className="text-[10px] text-slate-500 truncate">Ads: {location._count?.ads ?? 0} · Pincode: {location.pincode || '—'}</p>
                        </div>
                        <button onClick={() => handleToggleLocationActive(location)} className="rounded-md border border-slate-200/80 px-2 py-1 text-[10px] text-slate-500">{location.isActive ? 'Disable' : 'Enable'}</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 4: MANAGE ALL ADS */}
          {/* ================================================================== */}
          {activeTab === 'ALL_ADS' && (
            <div className="space-y-5 animate-fadeIn">
              <AdminPageHeader
                title="Manage All Classified Ads"
                description="Filter, inspect, feature, approve or remove listings across the platform"
                action={
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80">
                    {['ALL', 'ACTIVE', 'PENDING_REVIEW', 'REJECTED', 'SOLD'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setAdFilterStatus(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          adFilterStatus === st
                            ? 'bg-[#FFC439] text-[#081426]'
                            : 'text-slate-500  hover:text-slate-900 '
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                }
              />
              {/* Table of Ads */}
              <div className="cardmorphism rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/80">
                        <th className="py-3 px-4"><input type="checkbox" aria-label="Select all visible listings" checked={allAds.length > 0 && allAds.every((ad) => selectedAdIds.includes(ad.id))} onChange={(event) => setSelectedAdIds(event.target.checked ? allAds.map((ad) => ad.id) : [])} /></th>
                        <th className="py-3 px-4">ITEM</th>
                        <th className="py-3 px-4">CATEGORY</th>
                        <th className="py-3 px-4">PRICE</th>
                        <th className="py-3 px-4">SELLER</th>
                        <th className="py-3 px-4">LOCATION</th>
                        <th className="py-3 px-4">STATUS</th>
                        <th className="py-3 px-4 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adsLoading ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500">
                            <AdminLoadingState message="Loading ads database..." />
                          </td>
                        </tr>
                      ) : allAds.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500">
                            <AdminEmptyState message="No listings found for this filter." />
                          </td>
                        </tr>
                      ) : (
                        allAds.map((ad) => (
                          <tr key={ad.id} className="hover:bg-slate-50/80 /60 transition">
                            <td className="py-3 px-4"><input type="checkbox" aria-label={`Select ${ad.title}`} checked={selectedAdIds.includes(ad.id)} onChange={(event) => setSelectedAdIds((ids) => event.target.checked ? [...ids, ad.id] : ids.filter((id) => id !== ad.id))} /></td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={
                                    ad.images?.[0]?.displayUrl ||
                                    ad.images?.[0]?.url ||
                                    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100'
                                  }
                                  alt=""
                                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-200/80"
                                />
                                <div className="truncate max-w-xs">
                                  <span className="font-bold text-slate-900 block truncate">{ad.title}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">{ad.id.slice(0, 10)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-500">{ad.category?.name || 'Classified'}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{formatPrice(ad.price)}</td>
                            <td className="py-3 px-4 text-slate-500">{ad.user?.phoneNumber || 'Direct'}</td>
                            <td className="py-3 px-4 text-slate-500">{ad.location?.name || 'All India'}</td>
                            <td className="py-3 px-4">
                              <AdminStatusBadge status={ad.status} />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => fetchAdDetail(ad.id)}
                                  className="p-1.5 hover:bg-[#3B82F6]/20 text-blue-300 rounded-lg transition"
                                  title="View listing details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {ad.status !== 'ACTIVE' && (
                                  <button
                                    onClick={() => setPendingAction({ id: ad.id, status: 'ACTIVE' })}
                                    className="px-2 py-1 rounded bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 text-[10px] font-bold"
                                  >
                                    Approve
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteAd(ad.id)}
                                  className="p-1.5 hover:bg-[#F43F5E]/20 text-rose-400 rounded-lg transition"
                                  title="Delete ad"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-end gap-2 cardmorphism border border-slate-200/80 border-slate-200 rounded-2xl p-4 shadow-xs">
                  <input value={adSearchQuery} onChange={(e) => { setAdSearchQuery(e.target.value); setAdPage(1); }} placeholder="Keyword or listing ID" className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-900" />
                  <select value={selectedCategoryFilter} onChange={(e) => { setSelectedCategoryFilter(e.target.value); setAdPage(1); }} className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-900">
                    <option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                  <select value={adLocationFilter} onChange={(e) => { setAdLocationFilter(e.target.value); setAdPage(1); }} className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-900">
                    <option value="">All cities</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                  </select>
                  <input value={adSellerFilter} onChange={(e) => { setAdSellerFilter(e.target.value); setAdPage(1); }} placeholder="Seller ID" className="w-32 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-900" />
                  <select value={adReportedFilter} onChange={(e) => { setAdReportedFilter(e.target.value); setAdPage(1); }} className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-900"><option value="">All reports</option><option value="true">Reported</option><option value="false">Unreported</option></select>
                  <input type="number" min="0" value={adMinPrice} onChange={(e) => setAdMinPrice(e.target.value)} placeholder="Min price" className="w-24 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-900" />
                  <input type="number" min="0" value={adMaxPrice} onChange={(e) => setAdMaxPrice(e.target.value)} placeholder="Max price" className="w-24 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-900" />
                  <input type="date" value={adFrom} onChange={(e) => setAdFrom(e.target.value)} className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-2 py-2 text-xs text-slate-900" />
                  <input type="date" value={adTo} onChange={(e) => setAdTo(e.target.value)} className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-2 py-2 text-xs text-slate-900" />
                  <select value={`${adSort}:${adOrder}`} onChange={(e) => { const [sort, order] = e.target.value.split(':'); setAdSort(sort); setAdOrder(order); }} className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-900"><option value="createdAt:desc">Newest</option><option value="updatedAt:desc">Recently updated</option><option value="price:desc">Highest price</option><option value="price:asc">Lowest price</option><option value="expiresAt:asc">Expiring soon</option></select>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Page {adPage} of {adTotalPages}</span>
                  <div className="flex gap-2"><button disabled={!selectedAdIds.length} onClick={handleBulkStatus} className="rounded-lg bg-[#FFC439] px-3 py-1.5 font-bold text-[#081426] disabled:opacity-40">Bulk action ({selectedAdIds.length})</button><button disabled={adPage <= 1} onClick={() => setAdPage((page) => page - 1)} className="rounded-lg border border-slate-200/80 px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={adPage >= adTotalPages} onClick={() => setAdPage((page) => page + 1)} className="rounded-lg border border-slate-200/80 px-3 py-1.5 disabled:opacity-40">Next</button></div>
                </div>
                {selectedAd && (
                  <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="dialog" aria-modal="true">
                    <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200/80 bg-white p-6 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                        <div><h2 className="text-lg font-black text-slate-900">{selectedAd.ad?.title || 'Listing details'}</h2><p className="font-mono text-[10px] text-slate-500">{selectedAd.ad?.id}</p></div>
                        <button onClick={() => setSelectedAd(null)} className="rounded-lg border border-slate-200/80 px-3 py-1.5 text-xs text-slate-500">Close</button>
                      </div>
                      {adDetailLoading ? <AdminLoadingState message="Loading listing details..." /> : selectedAd.ad && (
                        <div className="space-y-5 py-5 text-sm">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {selectedAd.ad.images?.map((image: any) => <img key={image.id} src={image.displayUrl || image.originalUrl} alt={selectedAd.ad.title} className="h-24 w-full rounded-xl object-cover border border-slate-200/80" />)}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><span className="text-xs text-slate-500">Price</span><p className="font-bold">{formatPrice(selectedAd.ad.price)}</p></div>
                            <div><span className="text-xs text-slate-500">Status</span><p><AdminStatusBadge status={selectedAd.ad.status} /></p></div>
                            <div><span className="text-xs text-slate-500">Category</span><p>{selectedAd.ad.category?.name}</p></div>
                            <div><span className="text-xs text-slate-500">Location</span><p>{selectedAd.ad.location?.name}</p></div>
                            <div><span className="text-xs text-slate-500">Created</span><p>{new Date(selectedAd.ad.createdAt).toLocaleString()}</p></div>
                            <div><span className="text-xs text-slate-500">Expires</span><p>{new Date(selectedAd.ad.expiresAt).toLocaleString()}</p></div>
                          </div>
                          <div><h3 className="mb-1 font-bold">Description</h3><p className="whitespace-pre-wrap text-slate-500">{selectedAd.ad.description}</p></div>
                          <div><h3 className="mb-2 font-bold">Seller</h3><p>{selectedAd.ad.user?.profile?.name || 'Unnamed seller'} · {selectedAd.ad.user?.phoneNumber || 'No phone'}</p><p className="text-xs text-slate-500">Account: {selectedAd.ad.user?.status} · ID: {selectedAd.ad.user?.id}</p></div>
                          <div><h3 className="mb-2 font-bold">Dynamic attributes</h3><div className="grid grid-cols-2 gap-2">{selectedAd.ad.attributeValues?.map((item: any) => <div key={item.id} className="rounded-lg bg-slate-50/80 p-2"><span className="block text-[10px] text-slate-500">{item.attribute?.name}</span>{item.value}</div>)}</div></div>
                          <div><h3 className="mb-2 font-bold">Reports ({selectedAd.ad.reports?.length || 0})</h3>{selectedAd.ad.reports?.length ? selectedAd.ad.reports.map((report: any) => <div key={report.id} className="mb-2 rounded-lg border border-slate-200/80 p-2 text-xs"><AdminStatusBadge status={report.status} /> <span className="ml-2">{report.reason}</span><p className="mt-1 text-slate-500">{report.details}</p></div>) : <AdminEmptyState message="No reports linked to this listing." />}</div>
                          <div><h3 className="mb-2 font-bold">Moderation history</h3>{selectedAd.history?.length ? selectedAd.history.map((entry: any) => <div key={entry.id} className="border-l border-[#FFC439] pl-3 text-xs mb-3"><p>{entry.action} · {entry.user?.profile?.name || entry.user?.role || 'System'}</p><p className="text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p></div>) : <AdminEmptyState message="No moderation history recorded." />}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 5: USERS MANAGEMENT */}
          {/* ================================================================== */}
          {activeTab === 'USERS' && (
            <div className="space-y-5 animate-fadeIn">
              <AdminPageHeader title="Users & Safety" description="Search accounts, review trust signals and apply audited safety actions." />
              <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 border-slate-200 cardmorphism p-4 shadow-xs">
                <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setUserPage(1), fetchAdminUsers())} placeholder="Search ID, name, phone or email" className="min-w-[220px] flex-1 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-900" />
                <select value={userStatusFilter} onChange={(e) => { setUserStatusFilter(e.target.value); setUserPage(1); }} className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-900"><option value="">All statuses</option><option>ACTIVE</option><option>SUSPENDED</option><option>BANNED</option></select>
                <select value={userRoleFilter} onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1); }} className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-900"><option value="">All roles</option><option>USER</option><option>MODERATOR</option><option>ADMIN</option></select>
                <select value={userTypeFilter} onChange={(e) => { setUserTypeFilter(e.target.value); setUserPage(1); }} className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-900"><option value="">All account types</option><option>INDIVIDUAL</option><option>DEALER</option><option>BUSINESS</option></select>
                <button onClick={() => { setUserPage(1); fetchAdminUsers(); }} className="rounded-lg bg-[#FFC439] px-4 py-2 text-xs font-bold text-[#081426]">Search</button>
              </div>
              {usersError && <AdminErrorState message={usersError} onAction={fetchAdminUsers} />}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 border-slate-200 cardmorphism shadow-xs">
                <table className="w-full text-left text-xs"><thead className="bg-slate-50/80 text-[10px] uppercase text-slate-500"><tr><th className="p-3">User</th><th className="p-3">Verification</th><th className="p-3">Type</th><th className="p-3">Listings</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{usersLoading ? <tr><td colSpan={6}><AdminLoadingState message="Loading user accounts..." /></td></tr> : adminUsers.length === 0 ? <tr><td colSpan={6}><AdminEmptyState message="No users found." /></td></tr> : adminUsers.map((user) => <tr key={user.id} className="hover:bg-slate-50/80 /60"><td className="p-3"><button onClick={() => fetchUserDetail(user.id)} className="text-left"><span className="block font-bold text-slate-900">{user.profile?.name || 'Unnamed user'}</span><span className="font-mono text-[10px] text-slate-500">{user.id}</span><span className="block text-slate-500">{user.phoneNumber || user.email || 'Contact restricted'}</span></button></td><td className="p-3 text-slate-500">{user.isPhoneVerified ? 'Phone verified' : 'Unverified'}</td><td className="p-3 text-slate-500">{user.profile?.accountType || 'INDIVIDUAL'}</td><td className="p-3 text-slate-900">{user._count?.ads || 0}</td><td className="p-3"><AdminStatusBadge status={user.status} /></td><td className="p-3"><button onClick={() => fetchUserDetail(user.id)} className="rounded-lg border border-slate-200/80 px-2 py-1 text-[10px]">View profile</button></td></tr>)}</tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500"><span>Page {userPage} of {userTotalPages}</span><div className="flex gap-2"><button disabled={userPage <= 1} onClick={() => setUserPage((page) => page - 1)} className="rounded-lg border border-slate-200/80 px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={userPage >= userTotalPages} onClick={() => setUserPage((page) => page + 1)} className="rounded-lg border border-slate-200/80 px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
              {selectedUser && <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="dialog" aria-modal="true"><div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200/80 bg-white p-6"><div className="flex items-center justify-between border-b border-slate-200/80 pb-4"><div><h2 className="text-lg font-black">{selectedUser.profile?.name || 'User profile'}</h2><p className="font-mono text-[10px] text-slate-500">{selectedUser.id}</p></div><button onClick={() => setSelectedUser(null)} className="rounded-lg border border-slate-200/80 px-3 py-1.5 text-xs">Close</button></div>{userDetailLoading ? <AdminLoadingState message="Loading profile..." /> : <div className="space-y-5 py-5 text-sm"><div className="grid grid-cols-2 gap-3"><div><span className="text-xs text-slate-500">Contact</span><p>{selectedUser.phoneNumber || selectedUser.email || 'Restricted'}</p></div><div><span className="text-xs text-slate-500">Status</span><p><AdminStatusBadge status={selectedUser.status} /></p></div><div><span className="text-xs text-slate-500">Verification</span><p>{selectedUser.isPhoneVerified ? 'Phone verified' : 'Phone unverified'}</p></div><div><span className="text-xs text-slate-500">Account type</span><p>{selectedUser.profile?.accountType || 'INDIVIDUAL'} {selectedUser.profile?.businessName ? `· ${selectedUser.profile.businessName}` : ''}</p></div></div><div className="flex flex-wrap gap-2"><button onClick={() => handleUserAction(selectedUser.id, 'SUSPEND')} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black">Suspend</button><button onClick={() => handleUserAction(selectedUser.id, 'UNSUSPEND')} className="rounded-lg border border-[#10B981] px-3 py-2 text-xs font-bold text-[#10B981]">Unsuspend</button><button onClick={() => handleUserAction(selectedUser.id, 'BAN')} className="rounded-lg bg-[#F43F5E] px-3 py-2 text-xs font-bold text-white">Ban</button><button onClick={() => handleUserAction(selectedUser.id, 'DEACTIVATE')} className="rounded-lg border border-amber-500 px-3 py-2 text-xs font-bold text-amber-400">Deactivate</button><button onClick={() => handleUserAction(selectedUser.id, 'DELETE')} className="rounded-lg border border-[#F43F5E] px-3 py-2 text-xs font-bold text-[#F43F5E]">Delete/anonymize</button><button onClick={() => handleUserAction(selectedUser.id, 'RESTORE')} className="rounded-lg border border-[#3B82F6] px-3 py-2 text-xs font-bold text-[#3B82F6]">Restore</button><button onClick={() => handleUserAction(selectedUser.id, 'CLASSIFY')} className="rounded-lg border border-[#FFC439] px-3 py-2 text-xs font-bold text-[#FFC439]">Classify account</button></div><div><h3 className="mb-2 font-bold">Listings ({selectedUser.ads?.length || 0})</h3>{selectedUser.ads?.map((ad: any) => <div key={ad.id} className="mb-2 flex items-center justify-between rounded-lg border border-slate-200/80 p-2 text-xs"><span className="truncate">{ad.title}</span><AdminStatusBadge status={ad.status} /></div>)}</div><div><h3 className="mb-2 font-bold">Reports and previous actions</h3>{[...(selectedUser.reportsReceived || []), ...(selectedUser.auditLogs || [])].slice(0, 20).map((entry: any) => <div key={entry.id} className="mb-2 border-l border-[#FFC439] pl-3 text-xs"><p>{entry.action || entry.reason || 'Report'}</p><p className="text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p></div>)}</div></div>}</div></div>}
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 6: REPORTS & ANALYTICS */}
          {/* ================================================================== */}
          {activeTab === 'ANALYTICS' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#3B82F6]" />
                    Platform Analytics & Performance
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Traffic volume, listing conversion rates, and geographical distribution
                  </p>
                </div>
              </div>

              <div className="cardmorphism p-6 rounded-2xl space-y-4 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900">30-Day Activity Overview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 uppercase">Total Listings</span>
                    <span className="text-lg font-bold text-slate-900 block mt-1">{stats?.totalAds ?? '—'}</span>
                  </div>
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 uppercase">Conversations</span>
                    <span className="text-lg font-bold text-slate-900 block mt-1">{stats?.totalConversations ?? '—'}</span>
                  </div>
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 uppercase">Pending Review</span>
                    <span className="text-lg font-bold text-[#FFC439] block mt-1">{stats?.pendingAds ?? '—'}</span>
                  </div>
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 uppercase">Open Reports</span>
                    <span className="text-lg font-bold text-[#10B981] block mt-1">{stats?.totalReports ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 7: COMMENTS & MESSAGES */}
          {/* ================================================================== */}
          {activeTab === 'MESSAGES' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#FFC439]" />
                    Comments & Buyer-Seller Messages
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time chats and communication activity across classifieds
                  </p>
                </div>
              </div>

              <div className="cardmorphism p-6 rounded-2xl text-center text-xs text-slate-500 space-y-2 shadow-xs">
                <MessageSquare className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-40" />
                <p className="font-bold text-slate-900">Total Active Conversations: {stats?.totalConversations ?? '—'}</p>
                <p>Anti-fraud screening is actively running across all buyer-seller messages.</p>
                <div className="mt-4 space-y-2 text-left">
                  <p className="text-[10px]">Private content is sealed by default. Evidence access requires a linked report, a documented reason, and creates an audit log.</p>
                  {opsLoading ? <AdminLoadingState message="Loading operations..." /> : conversations.map((conversation) => (
                    <div key={conversation.id} className="flex items-center justify-between rounded border border-slate-200/80 p-2"><span>{conversation.ad?.title || 'Removed listing'} · {conversation._count?.messages || 0} messages · {conversation.isBlocked ? 'Blocked' : 'Active'}</span><button onClick={() => viewRestrictedConversation(conversation)} className="text-[#FFC439]">Evidence</button></div>
                  ))}
                  {tickets.map((ticket) => <div key={ticket.id} className="rounded border border-slate-200/80 p-2">Ticket {ticket.id.slice(0, 8)} · {ticket.subject} · {ticket.status} · {ticket.priority}</div>)}
                </div>
              </div>
              {selectedConversation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-xl rounded-xl bg-white p-6 text-left"><button onClick={() => setSelectedConversation(null)} className="float-right">Close</button><h3 className="font-bold">Authorized report evidence</h3>{restrictedMessages.map((message) => <p key={message.id} className="mt-3 rounded bg-slate-50/80 p-2">{message.content || '[Attachment]'}</p>)}</div></div>}
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 8: SAFETY & FRAUD DESK (MODERATION) */}
          {/* ================================================================== */}
          {activeTab === 'MODERATION' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-[#F43F5E]" />
                    Safety, Fraud & Moderation Desk
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review pending listings, investigate fraud complaints, and protect buyers
                  </p>
                </div>
              </div>

              {/* Pending Review Ads */}
              <div className="cardmorphism rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FFC439]" />
                    Pending Moderation Queue ({pendingAds.length})
                  </span>
                </div>

                {moderationLoading ? (
                  <AdminLoadingState message="Loading moderation queue..." />
                ) : pendingAds.length === 0 ? (
                  <AdminEmptyState
                    tone="success"
                    message="All listings are verified and clear. No pending review items!"
                  />
                ) : (
                  <div className="space-y-3">
                    {pendingAds.map((ad) => (
                      <div
                        key={ad.id}
                        className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={ad.images?.[0]?.displayUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100'}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200/80"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">{ad.title}</span>
                            <span className="text-[11px] text-[#FFC439] font-bold">{formatPrice(ad.price)}</span>
                            <span className="text-[10px] text-slate-500 block">Location: {ad.location?.name || 'All India'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleModerationReview(ad.id, 'APPROVE')}
                            className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-slate-950 text-xs font-bold transition cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleModerationReview(ad.id, 'REJECT')}
                            className="px-3 py-1.5 rounded-lg bg-[#F43F5E] hover:bg-rose-600 text-white text-xs font-bold transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User Reports & Complaints */}
              <div className="cardmorphism rounded-2xl p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#F43F5E]" />
                  User Complaints & Fraud Reports ({reports.length})
                </span>

                {reports.length === 0 ? (
                  <AdminEmptyState message="No open fraud reports from users." />
                ) : (
                  <div className="space-y-2">
                    {reports.map((rep) => (
                      <div key={rep.id} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-[#F43F5E] block">{rep.reason}</span>
                          <span className="text-[11px] text-slate-500">{rep.details || 'No additional details provided'}</span>
                        </div>
                        <button onClick={() => updateReport(rep.id, rep.status === 'PENDING' ? 'UNDER_REVIEW' : 'RESOLVED')} className="rounded border border-[#FFC439] px-2 py-1 text-[10px] font-bold text-[#FFC439]">{rep.status === 'PENDING' ? 'Investigate' : 'Resolve'}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 8: SETTINGS */}
          {/* ================================================================== */}
          {activeTab === 'SETTINGS' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn pb-12">
              <div className="border-b border-slate-200/80 pb-4">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-700" />
                  Admin System Settings & Profile
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage administrator credentials, profile details, security, and marketplace configurations
                </p>
              </div>

              {/* SECTION 1: ADMIN PROFILE EDIT */}
              <form onSubmit={handleSaveAdminProfile} className="cardmorphism p-5 sm:p-6 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Administrator Profile</h3>
                      <p className="text-[11px] text-slate-500">Update your name, contact details and display information</p>
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-300">
                    ADMIN
                  </span>
                </div>

                {adminProfileMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                      adminProfileMsg.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                        : 'bg-rose-50 border border-rose-300 text-rose-800'
                    }`}
                  >
                    <span>{adminProfileMsg.text}</span>
                    <button
                      type="button"
                      onClick={() => setAdminProfileMsg(null)}
                      className="text-[11px] font-bold opacity-70 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                      Admin Full Name *
                    </label>
                    <input
                      type="text"
                      value={adminProfileName}
                      onChange={(e) => setAdminProfileName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={adminProfileEmail}
                      onChange={(e) => setAdminProfileEmail(e.target.value)}
                      placeholder="e.g. admin@bharatmarket.in"
                      className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={adminProfilePhone}
                      onChange={(e) => setAdminProfilePhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                      Role / Designation
                    </label>
                    <input
                      type="text"
                      value={adminProfileBio}
                      onChange={(e) => setAdminProfileBio(e.target.value)}
                      placeholder="e.g. System Administrator & Trust Manager"
                      className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="submit"
                    disabled={savingAdminProfile}
                    className="bg-[#FFC439] hover:bg-[#f0b52b] text-[#081426] font-extrabold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-sm transition disabled:opacity-50"
                  >
                    {savingAdminProfile ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>

              {/* SECTION 2: PASSWORD CHANGE */}
              <form onSubmit={handleChangePassword} className="cardmorphism p-5 sm:p-6 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center font-bold">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Change Admin Password</h3>
                      <p className="text-[11px] text-slate-500">Update your login password to keep your administrator account secure</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>

                {passwordMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                      passwordMsg.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                        : 'bg-rose-50 border border-rose-300 text-rose-800'
                    }`}
                  >
                    <span>{passwordMsg.text}</span>
                    <button
                      type="button"
                      onClick={() => setPasswordMsg(null)}
                      className="text-[11px] font-bold opacity-70 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                      Current Password *
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password (default: admin123 or current)"
                      className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                        New Password * (Min 6 chars)
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new strong password"
                        className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                        Confirm New Password *
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="bg-[#10363A] hover:bg-[#002f34] text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-sm transition disabled:opacity-50"
                  >
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>

              {/* SECTION 3: PLATFORM SETTINGS */}
              <div className="cardmorphism p-5 sm:p-6 rounded-2xl space-y-4 text-xs shadow-xs">
                <div className="border-b border-slate-200/80 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">Platform Moderation & Expiry</h3>
                  <p className="text-[11px] text-slate-500">Configure global listing policies and automatic expiry windows</p>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <div>
                    <span className="font-bold text-slate-900 block">Require listing moderation</span>
                    <span className="text-slate-500 text-[11px]">New listings enter review when enabled</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(platformSettings.requireModeration)}
                    onChange={(event) => savePlatformSetting('requireModeration', event.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300"
                  />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <div>
                    <span className="font-bold text-slate-900 block">Listing expiry duration (Days)</span>
                    <span className="text-slate-500 text-[11px]">Applies to all newly created and renewed listings</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={platformSettings.listingExpiryDays ?? 30}
                    onChange={(event) =>
                      setPlatformSettings((current) => ({
                        ...current,
                        listingExpiryDays: Number(event.target.value),
                      }))
                    }
                    onBlur={(event) => savePlatformSetting('listingExpiryDays', Number(event.target.value))}
                    className="w-24 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-900 font-bold"
                  />
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => savePlatformSetting('featureFlags', platformSettings.featureFlags || {})}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-xs transition"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
