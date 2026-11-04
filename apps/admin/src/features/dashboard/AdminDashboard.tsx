import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Users,
  ShoppingBag,
  ShieldCheck,
  Activity,
  Search,
  Filter,
  CheckCircle2,
  Ban,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'BUSINESS_SELLER' | 'VERIFIED_SELLER' | 'BUYER' | 'DEALER';
  status: 'ACTIVE' | 'SUSPENDED';
  listingsCount: number;
  joined: string;
}

const INITIAL_USERS: AdminUserRow[] = [
  { id: 'usr_1', name: 'Rahul Sharma', email: 'rahul.s@techhub.in', role: 'BUSINESS_SELLER', status: 'ACTIVE', listingsCount: 248, joined: 'Aug 14, 2026' },
  { id: 'usr_2', name: 'Priya Verma', email: 'priya.v@gmail.com', role: 'VERIFIED_SELLER', status: 'ACTIVE', listingsCount: 14, joined: 'Sep 02, 2026' },
  { id: 'usr_3', name: 'Vikram Motors', email: 'contact@vikrammotors.com', role: 'DEALER', status: 'ACTIVE', listingsCount: 42, joined: 'Jul 19, 2026' },
  { id: 'usr_4', name: 'Karan Mehra', email: 'karan99@yahoo.com', role: 'BUYER', status: 'ACTIVE', listingsCount: 2, joined: 'Oct 05, 2026' },
  { id: 'usr_5', name: 'Ankit Patel', email: 'ankit.p@outlook.com', role: 'VERIFIED_SELLER', status: 'SUSPENDED', listingsCount: 1, joined: 'Sep 28, 2026' },
];

export function AdminDashboard() {
  const [users, setUsers] = useState<AdminUserRow[]>(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
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
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
          <div>
            <CardTitle className="text-base font-bold">Users Management</CardTitle>
            <p className="text-xs text-muted-foreground">Inspect accounts, manage privileges, and monitor KYC.</p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user or email..."
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3">User & Contact</th>
                  <th className="px-5 py-3">Account Type</th>
                  <th className="px-5 py-3">Listings</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Joined Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition">
                    <td className="px-5 py-3">
                      <div className="font-bold text-foreground">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {u.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-semibold text-foreground">{u.listingsCount} ads</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{u.joined}</td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm"
                        variant={u.status === 'ACTIVE' ? 'outline' : 'default'}
                        onClick={() => toggleStatus(u.id)}
                        className="h-7 text-xs"
                      >
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
