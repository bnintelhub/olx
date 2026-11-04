import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, UserCheck, UserX, Shield } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedDate: string;
}

const MOCK_USERS: UserData[] = [
  { id: '1', name: 'Rahul Sharma', email: 'rahul.s@example.com', role: 'USER', status: 'ACTIVE', joinedDate: '2026-02-14' },
  { id: '2', name: 'Pooja Verma', email: 'pooja.v@example.com', role: 'DEALER', status: 'ACTIVE', joinedDate: '2026-02-18' },
  { id: '3', name: 'Amit Kumar', email: 'amit.k@example.com', role: 'USER', status: 'SUSPENDED', joinedDate: '2026-01-20' },
  { id: '4', name: 'Neha Gupta', email: 'neha.g@example.com', role: 'MODERATOR', status: 'ACTIVE', joinedDate: '2025-11-04' },
  { id: '5', name: 'Vikram Singh', email: 'vikram.s@example.com', role: 'FINANCE_ADMIN', status: 'ACTIVE', joinedDate: '2025-12-10' },
];

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserData[]>(MOCK_USERS);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : u
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage buyer, seller, and staff accounts, assign capabilities, or handle suspensions.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Registered Accounts</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Shield className="h-3 w-3" />
                      <span>{user.role}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'ACTIVE' ? 'success' : 'destructive'}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{user.joinedDate}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={user.status === 'ACTIVE' ? 'destructive' : 'outline'}
                      onClick={() => toggleStatus(user.id)}
                      className="gap-1 text-xs"
                    >
                      {user.status === 'ACTIVE' ? (
                        <>
                          <UserX className="h-3.5 w-3.5" />
                          <span>Suspend</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Activate</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
