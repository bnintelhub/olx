import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { useTheme } from '../../app/theme-provider';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import { AdminRole } from '../../types';
import { ROLE_CONFIGS } from '../../lib/permissions';
import {
  Search,
  Calendar,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Crown,
  ShieldCheck,
  Eye,
  Check,
} from 'lucide-react';

const DASHBOARD_VIEWS: AdminRole[] = [
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
  const activeRole = useAuthStore((s) => s.role) || 'ADMIN';
  const setRole = useAuthStore((s) => s.setRole);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Strict authority identification: only genuine SUPER_ADMIN can toggle dashboards
  const userRole = user?.role || 'ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const effectiveRole = isSuperAdmin ? activeRole : userRole;

  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const viewMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setIsViewMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentRoleMeta = ROLE_CONFIGS[effectiveRole] || ROLE_CONFIGS.ADMIN;

  const displayName = user?.name || (isSuperAdmin ? 'Super Admin' : 'Rahul Kumar');
  const displayEmail = user?.email || (isSuperAdmin ? 'superadmin@gmail.com' : 'rahul@gmail.com');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'RK';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background text-foreground px-4 sm:px-6 shadow-2xs transition-colors duration-200">
      {/* Left: Sidebar Trigger & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        {/* Responsive shadcn Sidebar Trigger */}
        <SidebarTrigger />
        <Separator orientation="vertical" className="hidden sm:block h-4" />

        {/* Global Search Input */}
        <div className="relative w-full hidden sm:block">
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

      {/* Right Controls: Role Badge, View Switcher (Super Admin only), Theme Toggle, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Header Display: Authority Badge */}
        {isSuperAdmin ? (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Crown className="h-3.5 w-3.5 fill-amber-500/20" />
            <span className="hidden sm:inline">Authority:</span>
            <span>Super Admin</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
            <ShieldCheck className="h-3.5 w-3.5 fill-blue-500/20" />
            <span className="hidden sm:inline">Authority:</span>
            <span>Admin</span>
          </div>
        )}

        {/* Dashboard View Switcher: ONLY super admin can toggle across dashboards */}
        {isSuperAdmin && (
          <div className="relative" ref={viewMenuRef}>
            <button
              type="button"
              onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
              className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition shadow-2xs cursor-pointer"
              title="Switch Dashboard View"
            >
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span className="hidden md:inline text-muted-foreground">Dashboard:</span>
              <span className="font-bold">{currentRoleMeta.label}</span>
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </button>

            {isViewMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-card p-1 text-card-foreground shadow-xl z-50">
                <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Switch Role Dashboard
                </div>
                <div className="space-y-0.5">
                  {DASHBOARD_VIEWS.map((r) => {
                    const meta = ROLE_CONFIGS[r];
                    const Icon = meta.icon;
                    const isSelected = r === activeRole;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setRole(r);
                          setIsViewMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-primary-foreground font-semibold'
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
        )}

        {/* Theme Toggle (Light / Dark Mode) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
        </Button>

        {/* User Identity Profile Dropdown */}
        <div className="relative pl-1 border-l" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted/60 transition cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background font-black text-xs shadow-xs">
              {initials}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold leading-tight text-foreground">{displayName}</div>
              <div className="text-[10px] text-muted-foreground">{displayEmail}</div>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground hidden lg:block" />
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-card p-1.5 text-card-foreground shadow-xl z-50">
              <div className="px-2.5 py-1.5 border-b mb-1">
                <div className="text-xs font-bold text-foreground">{displayName}</div>
                <div className="text-[10px] text-muted-foreground">{displayEmail}</div>
                <Badge
                  variant="outline"
                  className={`mt-1 text-[9px] font-mono ${
                    isSuperAdmin
                      ? 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                      : 'border-blue-500/40 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {userRole}
                </Badge>
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
