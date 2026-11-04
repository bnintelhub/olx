import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, CheckCircle2, Mail, Phone, MapPin, Download, ChevronLeft, ChevronRight, Sparkles, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'SUPER_ADMIN' | 'BUSINESS_SELLER' | 'PRO_DEALER' | 'VERIFIED_USER' | 'BUYER';
  city: string;
  state: string;
  kycVerified: boolean;
  activeAds: number;
  totalDeals: number;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedDate: string;
  lastActive: string;
}

const INITIAL_USERS: UserRecord[] = [
  { id: 'usr_8921', name: 'Rahul Sharma', email: 'rahul.sharma@techhub.in', phone: '+91 98101 23456', role: 'BUSINESS_SELLER', city: 'New Delhi', state: 'Delhi NCR', kycVerified: true, activeAds: 248, totalDeals: 1420, status: 'ACTIVE', joinedDate: 'Aug 14, 2025', lastActive: '5m ago' },
  { id: 'usr_8922', name: 'Bharat Motors (Vikram S.)', email: 'sales@bharatmotors.co.in', phone: '+91 98220 98765', role: 'PRO_DEALER', city: 'Gurugram', state: 'Haryana', kycVerified: true, activeAds: 64, totalDeals: 512, status: 'ACTIVE', joinedDate: 'Jul 19, 2025', lastActive: '12m ago' },
  { id: 'usr_8923', name: 'Priya Verma', email: 'priya.verma@gmail.com', phone: '+91 98450 11223', role: 'VERIFIED_USER', city: 'Bengaluru', state: 'Karnataka', kycVerified: true, activeAds: 14, totalDeals: 38, status: 'ACTIVE', joinedDate: 'Sep 02, 2025', lastActive: '2h ago' },
  { id: 'usr_8924', name: 'Karan Mehra', email: 'karan99@yahoo.com', phone: '+91 97110 55443', role: 'BUYER', city: 'Mumbai', state: 'Maharashtra', kycVerified: false, activeAds: 2, totalDeals: 9, status: 'ACTIVE', joinedDate: 'Oct 05, 2025', lastActive: '1d ago' },
  { id: 'usr_8925', name: 'Ankit Patel', email: 'ankit.patel@outlook.com', phone: '+91 99090 44332', role: 'BUSINESS_SELLER', city: 'Ahmedabad', state: 'Gujarat', kycVerified: true, activeAds: 88, totalDeals: 340, status: 'ACTIVE', joinedDate: 'Nov 12, 2025', lastActive: '3h ago' },
  { id: 'usr_8926', name: 'Spam Bot Seller 99', email: 'crypto.profit24@tempmail.com', phone: '+91 91234 00000', role: 'BUYER', city: 'Noida', state: 'Uttar Pradesh', kycVerified: false, activeAds: 0, totalDeals: 0, status: 'SUSPENDED', joinedDate: 'Jan 10, 2026', lastActive: '3d ago' },
  { id: 'usr_8927', name: 'Sneha Deshmukh', email: 'sneha.d@techproperties.in', phone: '+91 98200 77889', role: 'PRO_DEALER', city: 'Pune', state: 'Maharashtra', kycVerified: true, activeAds: 42, totalDeals: 195, status: 'ACTIVE', joinedDate: 'Dec 01, 2025', lastActive: '18m ago' },
  { id: 'usr_8928', name: 'Amitabh Sen', email: 'amitabh.sen@kolkatamart.com', phone: '+91 98310 99881', role: 'VERIFIED_USER', city: 'Kolkata', state: 'West Bengal', kycVerified: true, activeAds: 18, totalDeals: 45, status: 'ACTIVE', joinedDate: 'Feb 14, 2026', lastActive: '35m ago' },
];

export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search) ||
      u.city.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map((u) => u.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
          toast.success(`Account for "${u.name}" marked as ${nextStatus}`);
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  const getRoleBadge = (role: UserRecord['role']) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-mono text-[10px]">Super Admin</Badge>;
      case 'BUSINESS_SELLER':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-mono text-[10px]">Business Seller</Badge>;
      case 'PRO_DEALER':
        return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-mono text-[10px]">Pro Dealer</Badge>;
      case 'VERIFIED_USER':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono text-[10px]">Verified User</Badge>;
      default:
        return <Badge variant="outline" className="font-mono text-[10px]">Buyer</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">User Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enterprise directory of 2,48,930 platform accounts, dealer memberships, and KYC credentials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 shadow-xs"
            onClick={() => toast.success('Exporting verified users CSV snapshot...')}
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export CSV</span>
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
                  onClick={() => setRoleFilter(r)}
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
              {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
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
              Showing {filteredUsers.length} of {users.length} members
            </div>
          </div>
        </CardHeader>

        {/* Professional Table Body */}
        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider text-muted-foreground font-bold">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0}
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
                  <TableHead className="px-4 py-3 text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-xs text-muted-foreground">
                      No accounts found matching your query.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedIds.includes(user.id);
                    const initials = user.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('');

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
                                <span>{user.email}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-mono">
                                <Phone className="h-2.5 w-2.5 shrink-0" />
                                <span>{user.phone}</span>
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
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              user.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                user.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                              }`}
                            />
                            <span>{user.status}</span>
                          </span>
                          <span className="text-[9px] text-muted-foreground block mt-0.5">
                            {user.lastActive}
                          </span>
                        </TableCell>

                        {/* Joined Date */}
                        <TableCell className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {user.joinedDate}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant={user.status === 'ACTIVE' ? 'outline' : 'default'}
                            onClick={() => toggleStatus(user.id)}
                            className={`h-7 px-2.5 text-xs font-semibold ${
                              user.status === 'ACTIVE'
                                ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Professional Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing <strong className="text-foreground">{filteredUsers.length}</strong> of{' '}
              <strong className="text-foreground">2,48,930</strong> total registered accounts
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-background text-foreground shadow-2xs font-mono">
                {page} / 31,116
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 p-0"
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
