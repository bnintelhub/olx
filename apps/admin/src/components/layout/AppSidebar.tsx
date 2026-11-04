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
            name: user?.name || 'Rahul Kumar',
            email: user?.email || 'rahul@gmail.com',
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
