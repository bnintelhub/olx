import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { getGroupedNavForRole, ROLE_CONFIGS } from '../../lib/permissions';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarFooter,
} from '../ui/sidebar';
import { Crown, Shield, User } from 'lucide-react';

export function AdminSidebar() {
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.role) || 'SUPER_ADMIN';
  const roleMeta = ROLE_CONFIGS[activeRole] || ROLE_CONFIGS.SUPER_ADMIN;
  const RoleIcon = roleMeta.icon;
  const navGroups = getGroupedNavForRole(activeRole);

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas" className="border-r border-border bg-card">
      {/* Sidebar Header: Simple Monochrome OLX Admin Logo */}
      <SidebarHeader className="border-b px-4 py-3">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
          {/* Simple, non-colorful OLX Admin Wordmark */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background font-black text-xs tracking-tight shadow-xs transition-transform group-hover:scale-105">
            OLX
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-foreground">OLX Admin</span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground block -mt-0.5">Management Portal</span>
          </div>
        </NavLink>
      </SidebarHeader>

      {/* Active Role Indicator Card */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2.5 rounded-lg border bg-muted/40 p-2 text-xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <RoleIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-xs font-bold text-foreground">{roleMeta.label}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="truncate text-[10px] text-muted-foreground block">{roleMeta.subtitle}</span>
          </div>
        </div>
      </div>

      {/* Sidebar Content with Grouped Navigation */}
      <SidebarContent className="px-2 py-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0 mb-3">
            <SidebarGroupLabel className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase px-2 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={`${item.href}-${item.title}`}>
                      <NavLink to={item.href} className="w-full block">
                        {({ isActive }) => (
                          <SidebarMenuButton isActive={isActive} tooltip={item.title} className="w-full justify-between">
                            <div className="flex items-center gap-2.5 truncate">
                              <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-data-[active=true]:text-primary-foreground" />
                              <span className="truncate">{item.title}</span>
                            </div>
                            {item.badge && (
                              <SidebarMenuBadge
                                className={
                                  item.badgeVariant === 'danger'
                                    ? 'bg-destructive text-destructive-foreground font-bold'
                                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold'
                                }
                              >
                                {item.badge}
                              </SidebarMenuBadge>
                            )}
                          </SidebarMenuButton>
                        )}
                      </NavLink>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Sidebar Footer: Super Admin Identity & Session Status */}
      <SidebarFooter className="border-t p-3 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-xs font-semibold text-foreground">{user?.email || 'rahul@gmail.com'}</div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Shield className="h-3 w-3 text-emerald-500" />
              <span>Full Access Mode</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
