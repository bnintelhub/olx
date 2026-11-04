import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="pl-64 flex min-h-screen flex-col">
        <AdminHeader />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
