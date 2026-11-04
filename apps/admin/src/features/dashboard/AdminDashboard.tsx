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
  Ban,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  role: 'BUSINESS_SELLER' | 'VERIFIED_SELLER' | 'BUYER' | 'DEALER';
  status: 'ACTIVE' | 'SUSPENDED';
  listingsCount: number;
  joined: string;
  kycVerified: boolean;
}

const INITIAL_USERS: AdminUserRow[] = [
  { id: 'usr_1', name: 'Rahul Sharma', email: 'rahul.s@techhub.in', phone: '+91 98101 23456', city: 'Delhi NCR', role: 'BUSINESS_SELLER', status: 'ACTIVE', listingsCount: 248, joined: 'Aug 14, 2025', kycVerified: true },
  { id: 'usr_2', name: 'Priya Verma', email: 'priya.v@gmail.com', phone: '+91 98450 11223', city: 'Bengaluru', role: 'VERIFIED_SELLER', status: 'ACTIVE', listingsCount: 14, joined: 'Sep 02, 2025', kycVerified: true },
  { id: 'usr_3', name: 'Vikram Motors', email: 'contact@vikrammotors.com', phone: '+91 98220 98765', city: 'Gurugram', role: 'DEALER', status: 'ACTIVE', listingsCount: 64, joined: 'Jul 19, 2025', kycVerified: true },
  { id: 'usr_4', name: 'Karan Mehra', email: 'karan99@yahoo.com', phone: '+91 97110 55443', city: 'Mumbai', role: 'BUYER', status: 'ACTIVE', listingsCount: 2, joined: 'Oct 05, 2025', kycVerified: false },
  { id: 'usr_5', name: 'Ankit Patel', email: 'ankit.p@outlook.com', phone: '+91 99090 44332', city: 'Ahmedabad', role: 'BUSINESS_SELLER', status: 'ACTIVE', listingsCount: 88, joined: 'Nov 12, 2025', kycVerified: true },
  { id: 'usr_6', name: 'Spam Actor 99', email: 'spam.bot24@tempmail.com', phone: '+91 91234 00000', city: 'Noida', role: 'BUYER', status: 'SUSPENDED', listingsCount: 0, joined: 'Sep 28, 2025', kycVerified: false },
];

export function AdminDashboard() {
  const [users, setUsers] = useState<AdminUserRow[]>(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.city.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const newStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
          toast.success(`User ${u.name} marked as ${newStatus}`);
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Admin Operations</h2>
          <p className="text-xs text-muted-foreground">
            Manage users, listings, categories, and marketplace operational integrity.
          </p>
        </div>
      </div>

      {/* 4 Operations KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Users</span>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,48,930</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Platform verified members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Verified Sellers</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45,210</div>
            <p className="text-[11px] text-muted-foreground mt-1">KYC completed accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Active Listings</span>
            <ShoppingBag className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4,28,357</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">+9.8% this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">System Health</span>
            <Activity className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">99.98%</div>
            <p className="text-[11px] text-muted-foreground mt-1">All services online</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Management Section */}
      <Card className="border shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 border-b">
          <div>
            <CardTitle className="text-base font-bold">Users Management</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Inspect accounts, manage privileges, and monitor KYC trust.</p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user, email or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 rounded-lg border bg-muted/40 pl-8 pr-3 text-xs focus:bg-background outline-none w-48"
              />
            </div>

            <div className="flex items-center rounded-lg border bg-muted/20 p-0.5 text-xs">
              {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    statusFilter === filter ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
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
              <TableHeader className="bg-muted/40 uppercase text-[10px] tracking-wider text-muted-foreground font-bold">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5 py-3 min-w-[220px]">User & Identity</TableHead>
                  <TableHead className="px-5 py-3 min-w-[130px]">Role / Tier</TableHead>
                  <TableHead className="px-5 py-3 min-w-[120px]">Location</TableHead>
                  <TableHead className="px-5 py-3 min-w-[110px]">Inventory</TableHead>
                  <TableHead className="px-5 py-3 min-w-[100px] text-center">Status</TableHead>
                  <TableHead className="px-5 py-3 min-w-[110px]">Joined Date</TableHead>
                  <TableHead className="px-5 py-3 text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const initials = u.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('');

                  return (
                    <TableRow key={u.id} className="transition-colors hover:bg-muted/30">
                      {/* User & Identity */}
                      <TableCell className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background font-bold text-xs shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                              <span className="truncate">{u.name}</span>
                              {u.kycVerified && (
                                <span title="KYC Verified">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span>{u.email}</span>
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

                      {/* Location */}
                      <TableCell className="px-5 py-3 text-xs text-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{u.city}</span>
                        </div>
                      </TableCell>

                      {/* Listings */}
                      <TableCell className="px-5 py-3 font-semibold text-xs text-foreground">
                        {u.listingsCount} ads
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-5 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                        {u.joined}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-5 py-3 text-right">
                        <Button
                          size="sm"
                          variant={u.status === 'ACTIVE' ? 'outline' : 'default'}
                          onClick={() => toggleStatus(u.id)}
                          className={`h-7 px-2.5 text-xs font-semibold ${
                            u.status === 'ACTIVE'
                              ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing <strong className="text-foreground">{filteredUsers.length}</strong> of{' '}
              <strong className="text-foreground">2,48,930</strong> accounts
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled className="h-7 w-7 p-0">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium px-2 py-0.5 rounded border bg-background text-foreground font-mono">
                1 / 41,488
              </span>
              <Button variant="outline" size="sm" disabled className="h-7 w-7 p-0">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
