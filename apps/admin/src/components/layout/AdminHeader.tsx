import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { LogOut, Bell, User } from 'lucide-react';

export function AdminHeader() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Management Console</h1>
        <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-mono">
          API: v1 / Live
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications Mock */}
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* User Identity Info */}
        <div className="flex items-center gap-2 pl-2 border-l">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden md:block text-left text-xs">
            <div className="font-semibold text-foreground">{user?.email || 'Admin User'}</div>
            <div className="text-[10px] text-muted-foreground">{user?.role || 'SUPER_ADMIN'}</div>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          className="ml-2 gap-1.5 text-xs text-destructive hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Logout</span>
        </Button>
      </div>
    </header>
  );
}
