import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { getGroupedNavForRole, ROLE_CONFIGS } from '../../lib/permissions';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  useSidebar,
} from '../ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

export function NavMain() {
  const activeRole = useAuthStore((s) => s.role) || 'SUPER_ADMIN';
  const roleMeta = ROLE_CONFIGS[activeRole] || ROLE_CONFIGS.SUPER_ADMIN;
  const RoleIcon = roleMeta.icon;
  const navGroups = getGroupedNavForRole(activeRole);
  const { isMobile, setOpenMobile, state } = useSidebar();
  const location = useLocation();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Active Role Indicator Card */}
      <div className="px-2 pt-1 pb-2">
        {state === 'collapsed' && !isMobile ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 cursor-default">
                <RoleIcon className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              <span className="font-bold">{roleMeta.label}</span>
              <span className="text-[10px] text-muted-foreground block">{roleMeta.subtitle}</span>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2 text-xs transition-colors duration-200">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
              <RoleIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate text-xs font-bold text-sidebar-foreground">{roleMeta.label}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              </div>
              <span className="truncate text-[10px] text-muted-foreground block">{roleMeta.subtitle}</span>
            </div>
          </div>
        )}
      </div>

      {/* Grouped Navigation Sections */}
      {navGroups.map((group) => (
        <SidebarGroup key={group.label} className="py-1 px-2">
          <SidebarGroupLabel className="text-[10px] font-bold text-sidebar-foreground/60 tracking-wider uppercase px-2 mb-1 group-data-[collapsible=icon]:hidden">
            {group.label}
          </SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

              return (
                <SidebarMenuItem key={`${item.href}-${item.title}`}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                    className={cn(
                      'transition-colors duration-150',
                      isActive
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90 hover:text-primary-foreground [&>svg]:text-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:text-sidebar-foreground/75'
                    )}
                  >
                    <NavLink to={item.href} onClick={handleLinkClick}>
                      <Icon className="h-4 w-4 shrink-0 transition-colors" />
                      <span className="truncate group-data-[collapsible=icon]:hidden font-medium text-xs">
                        {item.title}
                      </span>
                      {item.badge && (
                        <SidebarMenuBadge
                          className={cn(
                            'group-data-[collapsible=icon]:hidden ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                            item.badgeVariant === 'danger'
                              ? 'bg-destructive text-destructive-foreground'
                              : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                          )}
                        >
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </div>
  );
}
