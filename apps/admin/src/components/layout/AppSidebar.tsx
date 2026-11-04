import * as React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '../ui/sidebar';
import { TeamSwitcher } from './TeamSwitcher';
import { NavMain } from './NavMain';
import { NavUser } from './NavUser';
import { useAuthStore } from '../../stores/auth.store';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user?.name || (isSuperAdmin ? 'Super Admin' : 'Admin User'),
            email: user?.email || (isSuperAdmin ? 'superadmin@gmail.com' : 'admin@gmail.com'),
            role: user?.role || 'ADMIN',
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
