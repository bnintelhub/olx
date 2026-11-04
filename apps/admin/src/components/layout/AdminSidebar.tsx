import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { filterNavForRole, ROLE_CONFIGS } from '../../lib/permissions';
import { cn } from '../../lib/utils';
import { Shield } from 'lucide-react';

export function AdminSidebar() {
  const role = useAuthStore((s) => s.role) || 'SUPER_ADMIN';
  const roleMeta = ROLE_CONFIGS[role] || ROLE_CONFIGS.SUPER_ADMIN;
  const RoleIcon = roleMeta.icon;
  const navItems = filterNavForRole(role);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[#0B132B] text-slate-200 border-r border-slate-800/80 shadow-xl select-none">
      {/* Top Brand Header: OLX Admin Wordmark */}
      <div className="flex h-16 items-center px-5 border-b border-slate-800/80">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
          {/* Authentic Multi-color OLX Wordmark */}
          <svg className="h-7 w-auto transition-transform group-hover:scale-105" viewBox="0 0 102 48" fill="none">
            {/* O */}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M21 4C10.5066 4 2 12.5066 2 23C2 33.4934 10.5066 42 21 42C31.4934 42 40 33.4934 40 23C40 12.5066 31.4934 4 21 4ZM21 33C15.4772 33 11 28.5228 11 23C11 17.4772 15.4772 13 21 13C26.5228 13 31 17.4772 31 23C31 28.5228 26.5228 33 21 33Z"
              fill="#00A49F"
            />
            {/* L */}
            <path d="M46 5H55V34H66V42H46V5Z" fill="#FF3F55" />
            {/* X */}
            <path d="M70 5H79.5L88 19L96.5 5H106L94 23.5L106 42H96.5L88 28L79.5 42H70L82 23.5L70 5Z" fill="#FFCE32" />
          </svg>
          <span className="text-xl font-extrabold tracking-tight text-white">Admin</span>
        </NavLink>
      </div>

      {/* Role Profile Info Card */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#16213E]/80 p-2.5 shadow-inner">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RoleIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-xs font-bold text-white">{roleMeta.label}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="truncate text-[10px] text-slate-400">{roleMeta.subtitle}</div>
          </div>
        </div>
      </div>

      {/* Navigation Links matching the current role */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1 scrollbar-thin scrollbar-thumb-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={`${item.href}-${item.title}`}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                )
              }
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span className="truncate">{item.title}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs',
                    item.badgeVariant === 'danger'
                      ? 'bg-rose-500 text-white'
                      : item.badgeVariant === 'warning'
                      ? 'bg-amber-500 text-slate-950 font-extrabold'
                      : 'bg-blue-500/20 text-blue-300'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-slate-800/80 p-3.5 text-[11px] text-slate-400">
        <div className="flex items-center justify-between font-medium">
          <span className="text-slate-300">OLX Platform</span>
          <span className="text-[10px] rounded bg-slate-800 px-1.5 py-0.5 text-slate-400">v2.0</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
          <Shield className="h-3 w-3 text-emerald-400" />
          <span>RBAC Enforced Access</span>
        </div>
      </div>
    </aside>
  );
}
