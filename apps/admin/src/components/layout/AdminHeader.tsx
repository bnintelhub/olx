import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../ui/button';
import { AdminRole } from '../../types';
import { ROLE_CONFIGS } from '../../lib/permissions';
import {
  Search,
  Calendar,
  Bell,
  HelpCircle,
  ChevronDown,
  LogOut,
  UserCheck,
  Check,
} from 'lucide-react';

const ADMIN_ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'CUSTOMER_SUPPORT',
  'FINANCE_ADMIN',
  'CONTENT_MANAGER',
  'ANALYST',
];

export function AdminHeader() {
  const user = useAuthStore((s) => s.user);
  const currentRole = useAuthStore((s) => s.role) || 'SUPER_ADMIN';
  const setRole = useAuthStore((s) => s.setRole);
  const logout = useAuthStore((s) => s.logout);

  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentRoleMeta = ROLE_CONFIGS[currentRole] || ROLE_CONFIGS.SUPER_ADMIN;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Global Search Bar */}
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users, listings, reports, categories..."
            className="h-9 w-full rounded-lg border border-input bg-muted/30 pl-9 pr-14 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shadow-2xs">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Right Controls: Date Range, Role Switcher, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Date Filter Indicator */}
        <div className="hidden lg:flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Oct 1, 2026 - Oct 31, 2026</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
        </div>

        {/* Dynamic Role Switcher (Multi-role Preview & RBAC Toggle) */}
        <div className="relative" ref={roleMenuRef}>
          <button
            type="button"
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/40 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 transition shadow-2xs cursor-pointer"
            title="Switch Dashboard & Sidebar Role View"
          >
            <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Role:</span>
            <span className="font-bold">{currentRoleMeta.label}</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>

          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-card p-1 text-card-foreground shadow-xl z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select Admin Role
              </div>
              <div className="space-y-0.5">
                {ADMIN_ROLES.map((r) => {
                  const meta = ROLE_CONFIGS[r];
                  const Icon = meta.icon;
                  const isSelected = r === currentRole;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r);
                        setIsRoleMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{meta.label}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-muted-foreground h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
        </Button>

        {/* Help Button */}
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-muted-foreground h-9 w-9">
          <HelpCircle className="h-4 w-4" />
        </Button>

        {/* User Identity Profile Dropdown */}
        <div className="relative pl-1 border-l" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2.5 rounded-lg p-1 hover:bg-muted/60 transition cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-xs text-white shadow-xs">
              RK
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold leading-tight text-foreground">
                {user?.name || 'Rahul Kumar'}
              </div>
              <div className="text-[10px] text-muted-foreground">{currentRoleMeta.label}</div>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-card p-1.5 text-card-foreground shadow-xl z-50">
              <div className="px-2.5 py-1.5 border-b mb-1">
                <div className="text-xs font-bold text-foreground">{user?.name || 'Rahul Kumar'}</div>
                <div className="text-[10px] text-muted-foreground">{user?.email || 'admin@olx.in'}</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
