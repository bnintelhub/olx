import * as React from 'react';
import { ChevronsUpDown, Plus, Building2, Store, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '../ui/sidebar';

export interface Team {
  name: string;
  logo: React.ElementType;
  plan: string;
}

const DEFAULT_TEAMS: Team[] = [
  {
    name: 'OLX India',
    logo: Building2,
    plan: 'Enterprise Admin',
  },
  {
    name: 'Bharat Motors',
    logo: Store,
    plan: 'Pro Dealer Network',
  },
  {
    name: 'TechHub Portal',
    logo: Sparkles,
    plan: 'Verified Marketplace',
  },
];

export function TeamSwitcher({ teams = DEFAULT_TEAMS }: { teams?: Team[] }) {
  const [activeTeam, setActiveTeam] = React.useState(teams[0]);
  const Logo = activeTeam.logo;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-foreground text-background shrink-0 font-bold">
                <Logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-bold text-foreground">{activeTeam.name}</span>
                <span className="truncate text-[10px] text-muted-foreground">{activeTeam.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Workspaces & Teams
            </DropdownMenuLabel>
            {teams.map((team, index) => {
              const TeamLogo = team.logo;
              return (
                <DropdownMenuItem
                  key={team.name}
                  onClick={() => setActiveTeam(team)}
                  className="gap-2 p-2 text-xs"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <TeamLogo className="size-3.5 shrink-0" />
                  </div>
                  <span className="font-medium text-foreground">{team.name}</span>
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2 text-xs text-muted-foreground">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-3.5" />
              </div>
              <div className="font-medium text-foreground">Add workspace</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
