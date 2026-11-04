import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import {
  Search,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  MoreHorizontal,
  Ban,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUsersQuery } from './hook/useUsersQuery';
import { useUpdateUserStatusMutation } from './hook/useUsersMutation';
import { UserRecord, UserStatus } from './service/users.service';

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounce search input to avoid excessive requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Query users with search, role, status, and pagination
  const { data, isLoading, isError, error, refetch } = useUsersQuery({
    page,
    limit,
    q: debouncedSearch,
    role: roleFilter,
    status: statusFilter,
  });

  // Mutation for updating user lifecycle status
  const updateStatusMutation = useUpdateUserStatusMutation();

  const users = data?.users || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const totalUsers = pagination?.total || 0;

  const handleRoleChange = (role: string) => {
    setRoleFilter(role);
    setPage(1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleStatusUpdate = (userId: string, newStatus: UserStatus) => {
    updateStatusMutation.mutate({ id: userId, status: newStatus });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getRoleBadge = (role: UserRecord['role']) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-mono text-[10px]">Super Admin</Badge>;
      case 'ADMIN':
        return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-mono text-[10px]">Admin</Badge>;
      case 'BUSINESS_SELLER':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-mono text-[10px]">Business Seller</Badge>;
      case 'PRO_DEALER':
        return <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-mono text-[10px]">Pro Dealer</Badge>;
      case 'VERIFIED_USER':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono text-[10px]">Verified User</Badge>;
      default:
        return <Badge variant="outline" className="font-mono text-[10px]">Buyer</Badge>;
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>ACTIVE</span>
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>SUSPENDED</span>
          </span>
        );
      case 'BANNED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span>BANNED</span>
          </span>
        );
      case 'DELETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            <span>DELETED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">User Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Directory of registered platform accounts, dealer memberships, and KYC credentials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 shadow-xs"
            onClick={() => toast.success('Exporting users CSV snapshot...')}
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 shadow-xs"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button size="sm" className="text-xs gap-1.5 h-8">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Add User Account</span>
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-xs">
        {/* Controls Toolbar */}
        <CardHeader className="p-4 sm:p-5 border-b space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, city..."
                className="pl-9 h-9 text-xs bg-muted/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {['ALL', 'BUSINESS_SELLER', 'PRO_DEALER', 'VERIFIED_USER', 'BUYER'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition shrink-0 cursor-pointer ${
                    roleFilter === r
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Filter & Status Bar */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Status:</span>
              {(['ALL', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(s)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                    statusFilter === s
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-muted-foreground font-mono">
              Showing {users.length} of {totalUsers} accounts
            </div>
          </div>
        </CardHeader>

        {/* Table Body */}
        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider text-muted-foreground font-bold">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedIds.length === users.length}
                      onChange={toggleSelectAll}
                      className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="px-4 py-3 min-w-[220px]">User & Identity</TableHead>
                  <TableHead className="px-4 py-3 min-w-[130px]">Role / Tier</TableHead>
                  <TableHead className="px-4 py-3 min-w-[140px]">Location</TableHead>
                  <TableHead className="px-4 py-3 min-w-[100px] text-center">KYC Trust</TableHead>
                  <TableHead className="px-4 py-3 min-w-[110px] text-right">Marketplace Activity</TableHead>
                  <TableHead className="px-4 py-3 min-w-[100px] text-center">Status</TableHead>
                  <TableHead className="px-4 py-3 min-w-[110px]">Joined Date</TableHead>
                  <TableHead className="px-4 py-3 text-right min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span>Loading user directory...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-xs text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        <span>Failed to load users: {(error as any)?.message || 'Network error'}</span>
                        <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs h-7">
                          Try again
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-xs text-muted-foreground">
                      No accounts found matching your query.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const isSelected = selectedIds.includes(user.id);
                    const initials = (user.name || 'User')
                      .split(' ')
                      .filter(Boolean)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'U';

                    return (
                      <TableRow
                        key={user.id}
                        className={`transition-colors hover:bg-muted/30 ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <TableCell className="w-10 px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(user.id)}
                            className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                          />
                        </TableCell>

                        {/* User Identity */}
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background font-bold text-xs shrink-0 shadow-2xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                <span className="truncate">{user.name}</span>
                                {user.kycVerified && (
                                  <span title="KYC Verified">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span>{user.email || 'No email registered'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-mono">
                                <Phone className="h-2.5 w-2.5 shrink-0" />
                                <span>{user.phone || 'No phone registered'}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Role / Tier */}
                        <TableCell className="px-4 py-3">
                          {getRoleBadge(user.role)}
                        </TableCell>

                        {/* Location */}
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>{user.city}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block pl-4">
                            {user.state}
                          </span>
                        </TableCell>

                        {/* KYC Verification */}
                        <TableCell className="px-4 py-3 text-center">
                          {user.kycVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <ShieldAlert className="h-3 w-3" />
                              <span>Pending</span>
                            </span>
                          )}
                        </TableCell>

                        {/* Marketplace Activity */}
                        <TableCell className="px-4 py-3 text-right">
                          <div className="font-bold text-xs text-foreground">{user.activeAds} ads</div>
                          <span className="text-[10px] text-muted-foreground">{user.totalDeals} closed deals</span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-4 py-3 text-center">
                          {getStatusBadge(user.status)}
                          <span className="text-[9px] text-muted-foreground block mt-0.5">
                            {user.lastActive}
                          </span>
                        </TableCell>

                        {/* Joined Date */}
                        <TableCell className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {user.joinedDate}
                        </TableCell>

                        {/* Actions (Three Dots Menu for UserStatus options) */}
                        <TableCell className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 cursor-pointer hover:bg-muted"
                                disabled={updateStatusMutation.isPending}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open options</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                User Status
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={user.status === 'ACTIVE' || updateStatusMutation.isPending}
                                onClick={() => handleStatusUpdate(user.id, 'ACTIVE')}
                                className="text-xs flex items-center gap-2 cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-950/20"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Set Active</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={user.status === 'SUSPENDED' || updateStatusMutation.isPending}
                                onClick={() => handleStatusUpdate(user.id, 'SUSPENDED')}
                                className="text-xs flex items-center gap-2 cursor-pointer text-amber-600 focus:text-amber-700 focus:bg-amber-50 dark:focus:bg-amber-950/20"
                              >
                                <ShieldAlert className="h-3.5 w-3.5" />
                                <span>Suspend</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={user.status === 'BANNED' || updateStatusMutation.isPending}
                                onClick={() => handleStatusUpdate(user.id, 'BANNED')}
                                className="text-xs flex items-center gap-2 cursor-pointer text-orange-600 focus:text-orange-700 focus:bg-orange-50 dark:focus:bg-orange-950/20"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                <span>Ban</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={user.status === 'DELETED' || updateStatusMutation.isPending}
                                onClick={() => handleStatusUpdate(user.id, 'DELETED')}
                                className="text-xs flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing <strong className="text-foreground">{users.length}</strong> of{' '}
              <strong className="text-foreground">{totalUsers}</strong> total registered accounts
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-background text-foreground shadow-2xs font-mono">
                {page} / {Math.max(1, totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
