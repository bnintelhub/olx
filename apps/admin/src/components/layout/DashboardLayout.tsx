import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '../ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AdminHeader } from './AdminHeader';

export function DashboardLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <AdminHeader />
        <div className="flex-1 p-4 sm:p-6 overflow-x-hidden min-w-0 bg-background text-foreground">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
