import { useAuthStore } from '../../stores/auth.store';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { AdminDashboard } from './AdminDashboard';
import { ModeratorDashboard } from './ModeratorDashboard';
import { SupportDashboard } from './SupportDashboard';
import { FinanceAdminDashboard } from './FinanceAdminDashboard';
import { ContentManagerDashboard } from './ContentManagerDashboard';
import { AnalystDashboard } from './AnalystDashboard';

export function DashboardPage() {
  const role = useAuthStore((s) => s.role) || 'SUPER_ADMIN';

  // Render role-specific dashboard views
  switch (role) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    case 'MODERATOR':
      return <ModeratorDashboard />;
    case 'CUSTOMER_SUPPORT':
      return <SupportDashboard />;
    case 'FINANCE_ADMIN':
      return <FinanceAdminDashboard />;
    case 'CONTENT_MANAGER':
      return <ContentManagerDashboard />;
    case 'ANALYST':
      return <AnalystDashboard />;
    default:
      return <SuperAdminDashboard />;
  }
}
