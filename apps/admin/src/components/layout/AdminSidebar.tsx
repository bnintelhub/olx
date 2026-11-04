import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { filterNavForRole } from '../../lib/permissions';
import { cn } from '../../lib/utils';
import { ShieldCheck } from 'lucide-react';

export function AdminSidebar() {
  const role = useAuthStore((s) => s.role) || 'SUPER_ADMIN';
  const navItems = filterNavForRole(role);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-card shadow-sm">
      {/* Brand & Portal Header */}
      <div className="flex h-16 items-center border-b px-6">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight text-primary">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-extrabold leading-none text-foreground">OLX Operations</div>
            <div className="text-[11px] font-medium text-muted-foreground mt-0.5">Admin Central</div>
          </div>
        </NavLink>
      </div>

      {/* Role Indicator Card */}
      <div className="px-4 py-3">
        <div className="rounded-md border bg-muted/40 p-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active Role</div>
          <div className="text-xs font-bold text-foreground mt-0.5 flex items-center justify-between">
            <span>{role.replace(/_/g, ' ')}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Role-Driven Nav List */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
              {item.badge && (
                <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t p-4 text-[11px] text-muted-foreground">
        <div>OLX Core Platform v2.0</div>
        <div className="text-[10px] opacity-75">Multi-Role RBAC Active</div>
      </div>
    </aside>
  );
}
