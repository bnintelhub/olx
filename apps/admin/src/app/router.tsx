import React from 'react';
import { createBrowserRouter, Navigate, useRouteError } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { AdminRole } from '../types';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { AcceptInvitePage } from '../features/auth/AcceptInvitePage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ModeratorDashboard } from '../features/dashboard/ModeratorDashboard';
import { UsersPage } from '../features/users/UsersPage';
import { ListingsPage } from '../features/listings/ListingsPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { ChatModerationPage } from '../features/chat-moderation/ChatModerationPage';
import { CategoriesPage } from '../features/categories/CategoriesPage';
import { LocationsPage } from '../features/locations/LocationsPage';
import { MediaPage } from '../features/media/MediaPage';
import { PaymentsPage } from '../features/payments/PaymentsPage';
import { PromotionsPage } from '../features/promotions/PromotionsPage';
import { RevenuePolicyPage } from '../features/revenue/RevenuePolicyPage';
import { SupportPage } from '../features/support/SupportPage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { RolesPage } from '../features/roles-permissions/RolesPage';
import { AuditLogsPage } from '../features/audit-logs/AuditLogsPage';
import { SettingsPage } from '../features/settings/SettingsPage';

function RouteErrorBoundary() {
  const error = useRouteError() as any;
  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-xl space-y-4">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
        <h1 className="text-lg font-bold">Admin Portal Error</h1>
        <p className="text-xs text-muted-foreground break-words">
          {error?.message || 'An unexpected rendering error occurred. Please reload.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          Reload Portal
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <div className="text-xs text-muted-foreground">Authenticating session...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || (user.role as string) === 'USER') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Route guard to protect Super Admin-only sections from restricted roles
function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: AdminRole[];
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.role);

  // Super Admin account has full access across all modules
  if (user?.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  const effectiveRole = user?.role || activeRole || 'ADMIN';
  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/accept-invite',
    element: <AcceptInvitePage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'listings',
        element: <ListingsPage />,
      },
      {
        path: 'moderation',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'MODERATOR']}>
            <ModeratorDashboard />
          </RoleGuard>
        ),
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'chat-moderation',
        element: <ChatModerationPage />,
      },
      {
        path: 'categories',
        element: <CategoriesPage />,
      },
      {
        path: 'locations',
        element: <LocationsPage />,
      },
      {
        path: 'media',
        element: <MediaPage />,
      },
      {
        path: 'payments',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'FINANCE_ADMIN']}>
            <PaymentsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'promotions',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'CONTENT_MANAGER', 'ADMIN']}>
            <PromotionsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'revenue-policy',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'FINANCE_ADMIN', 'ADMIN', 'CONTENT_MANAGER']}>
            <RevenuePolicyPage />
          </RoleGuard>
        ),
      },
      {
        path: 'support',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'CUSTOMER_SUPPORT']}>
            <SupportPage />
          </RoleGuard>
        ),
      },
      {
        path: 'analytics',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'ANALYST']}>
            <AnalyticsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'roles-permissions',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN']}>
            <RolesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'audit-logs',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN']}>
            <AuditLogsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'settings',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN']}>
            <SettingsPage />
          </RoleGuard>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
], {
  basename: (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/',
});

