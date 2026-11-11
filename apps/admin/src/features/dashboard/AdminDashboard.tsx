import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import {
  Users,
  ShoppingBag,
  ShieldCheck,
  Activity,
  Search,
  CheckCircle2,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useDashboardStats, useAdminUsers } from './hook/useDashboardQuery';
import { useUserAction } from './hook/useDashboardMutation';

export function AdminDashboard() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  const { data: stats, isFetching: statsFetching, refetch: refetchStats } = useDashboardStats('ADMIN');
  const {
    data: userData,
    isLoading: usersLoading,
    isFetching: usersFetching,
    refetch: refetchUsers,
  } = useAdminUsers({
    page,
    limit: 10,
    q: search.trim() || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  const userActionMutation = useUserAction();

  const users = userData?.users || [];
  const pagination = userData?.pagination || { total: 0, pages: 1, page: 1, limit: 10 };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const nextAction = currentStatus === 'ACTIVE' ? 'SUSPEND' : 'ACTIVATE';
    userActionMutation.mutate({
      id,
      action: nextAction,
      reason: 'Admin operational dashboard toggle',
    });
  };

  const handleRefreshAll = () => {
    refetchStats();
    refetchUsers();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Admin Operations
            </h1>
            <Badge
              variant="outline"
              className="px-2.5 py-0.5 text-xs font-bold border-primary/30 text-primary bg-primary/5"
            >
              Operations Console
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage marketplace users, inventory health, categories, and account privileges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={statsFetching || usersFetching}
            className="h-9 gap-2 text-xs font-semibold border-border hover:bg-muted"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${statsFetching || usersFetching ? 'animate-spin text-primary' : ''}`}
            />
            <span>Refresh Operations</span>
          </Button>
        </div>
      </div>

      {/* 4 Operations KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Users
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              {(stats?.totalUsers ?? 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Platform registered members
            </p>
          </CardContent>
        </Card>

        {/* Verified Profiles */}
        <Card className="rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Verified Profiles
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              {(stats?.verifiedUsers ?? 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Accounts with complete profiles
            </p>
          </CardContent>
        </Card>

        {/* Marketplace Listings */}
        <Card className="rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Marketplace Listings
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              {(stats?.totalAds ?? stats?.activeAds ?? 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {stats?.activeAds ?? 0} active · {stats?.pendingAds ?? 0} pending
            </p>
          </CardContent>
        </Card>

        {/* Suspended Accounts */}
        <Card className="rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Suspended Accounts
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
              {(stats?.suspendedUsers ?? 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Policy violation enforcements
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Management Section */}
      <Card className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-extrabold text-foreground">
                Users & Accounts Directory
              </CardTitle>
              <Badge variant="outline" className="text-xs font-mono">
                {pagination.total.toLocaleString('en-IN')} Total
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inspect user identities, filter by active or suspended standing, and manage account access.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user, phone or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-xl border border-border bg-muted/30 pl-8 pr-3 text-xs focus:bg-background focus:ring-1 focus:ring-primary outline-none w-48 sm:w-56 text-foreground placeholder:text-muted-foreground transition"
              />
            </div>

            <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1 text-xs">
              {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setStatusFilter(filter);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                    statusFilter === filter
                      ? 'bg-background shadow-xs text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider text-muted-foreground font-bold border-b border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5 py-3 min-w-[220px]">User & Identity</TableHead>
                  <TableHead className="px-5 py-3 min-w-[130px]">Role / Tier</TableHead>
                  <TableHead className="px-5 py-3 min-w-[120px]">Contact</TableHead>
                  <TableHead className="px-5 py-3 min-w-[110px]">Inventory</TableHead>
                  <TableHead className="px-5 py-3 min-w-[100px] text-center">Status</TableHead>
                  <TableHead className="px-5 py-3 min-w-[110px]">Joined Date</TableHead>
                  <TableHead className="px-5 py-3 text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span>Loading user accounts...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground text-xs">
                      No user accounts found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const displayName = u.profile?.name || u.phoneNumber || 'User';
                    const initials = displayName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <TableRow key={u.id} className="transition-colors hover:bg-muted/30 border-b border-border/50">
                        {/* User & Identity */}
                        <TableCell className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background font-bold text-xs shrink-0 shadow-2xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                <span className="truncate">{displayName}</span>
                                {u.profile?.name && (
                                  <span title="Verified Profile">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span>{u.email || 'No email provided'}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell className="px-5 py-3">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {u.role.replace('_', ' ')}
                          </Badge>
                        </TableCell>

                        {/* Contact */}
                        <TableCell className="px-5 py-3 text-xs text-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>{u.phoneNumber || '—'}</span>
                          </div>
                        </TableCell>

                        {/* Listings */}
                        <TableCell className="px-5 py-3 font-semibold text-xs text-foreground">
                          {u._count?.ads ?? 0} ads
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-5 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                u.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                              }`}
                            />
                            <span>{u.status}</span>
                          </span>
                        </TableCell>

                        {/* Joined Date */}
                        <TableCell className="px-5 py-3 text-xs text-muted-foreground font-mono">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="px-5 py-3 text-right">
                          <Button
                            size="sm"
                            variant={u.status === 'ACTIVE' ? 'outline' : 'default'}
                            disabled={userActionMutation.isPending}
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className={`h-7 px-3 text-xs font-semibold ${
                              u.status === 'ACTIVE'
                                ? 'text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing <strong className="text-foreground">{users.length}</strong> of{' '}
              <strong className="text-foreground">{pagination.total.toLocaleString('en-IN')}</strong> accounts
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || usersLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0 rounded-lg border-border"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg border border-border bg-background text-foreground font-mono">
                {page} / {pagination.pages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.pages || usersLoading}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 w-8 p-0 rounded-lg border-border"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
