import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { PanelLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

const SIDEBAR_COOKIE_NAME = 'sidebar:state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '3.5rem';

interface SidebarContextValue {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export interface SidebarProviderProps extends React.ComponentProps<'div'> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(
  ({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }, ref) => {
    const [isMobile, setIsMobile] = React.useState(false);
    const [openMobile, setOpenMobile] = React.useState(false);
    const [_open, _setOpen] = React.useState(defaultOpen);

    const open = openProp ?? _open;
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === 'function' ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      },
      [setOpenProp, open]
    );

    const toggleSidebar = React.useCallback(() => {
      return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
    }, [isMobile, setOpen, setOpenMobile]);

    React.useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const state = open ? 'expanded' : 'collapsed';

    const contextValue = React.useMemo<SidebarContextValue>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            ref={ref}
            style={
              {
                '--sidebar-width': SIDEBAR_WIDTH,
                '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn('group/sidebar-wrapper flex min-h-screen w-full has-[[data-variant=inset]]:bg-sidebar', className)}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = 'SidebarProvider';

export const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    side?: 'left' | 'right';
    variant?: 'sidebar' | 'floating' | 'inset';
    collapsible?: 'offcanvas' | 'icon' | 'none';
  }
>(({ side = 'left', variant = 'sidebar', collapsible = 'offcanvas', className, children, ...props }, ref) => {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === 'none') {
    return (
      <div
        className={cn('flex h-full w-[--sidebar-width] flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-colors duration-200', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    if (!openMobile) return null;
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setOpenMobile(false)} />
        <div
          ref={ref}
          className={cn(
            'relative flex h-full w-[--sidebar-width-mobile] flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground shadow-2xl z-50 p-0 transition-colors duration-200',
            className
          )}
          style={{ width: SIDEBAR_WIDTH_MOBILE }}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'group peer hidden md:block text-sidebar-foreground transition-[width] ease-linear duration-200 shrink-0',
        state === 'collapsed' ? 'w-[--sidebar-width-icon]' : 'w-[--sidebar-width]',
        className
      )}
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-variant={variant}
      data-side={side}
    >
      <div
        className={cn(
          'fixed inset-y-0 z-20 hidden h-screen w-[--sidebar-width] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[left,right,width] ease-linear md:flex duration-200',
          side === 'left' ? 'left-0' : 'right-0',
          state === 'collapsed' && 'w-[--sidebar-width-icon]',
          variant === 'floating' || variant === 'inset' ? 'p-2' : ''
        )}
      >
        <div className="flex h-full w-full flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
});
Sidebar.displayName = 'Sidebar';

export const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<'main'>>(
  ({ className, ...props }, ref) => {
    return (
      <main
        ref={ref}
        className={cn(
          'relative flex min-h-screen flex-1 flex-col bg-background min-w-0 transition-all duration-200',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarInset.displayName = 'SidebarInset';

export const SidebarRail = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(
  ({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar();
    return (
      <button
        ref={ref}
        data-sidebar="rail"
        aria-label="Toggle Sidebar"
        tabIndex={-1}
        onClick={toggleSidebar}
        title="Toggle Sidebar"
        className={cn(
          'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex cursor-pointer',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarRail.displayName = 'SidebarRail';

export const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = 'SidebarTrigger';

export const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} data-sidebar="header" className={cn('flex flex-col gap-2 p-2 border-b border-sidebar-border/60 bg-sidebar transition-colors duration-200', className)} {...props} />;
  }
);
SidebarHeader.displayName = 'SidebarHeader';

export const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="content"
        className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden no-scrollbar bg-sidebar transition-colors duration-200', className)}
        {...props}
      />
    );
  }
);
SidebarContent.displayName = 'SidebarContent';

export const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} data-sidebar="footer" className={cn('flex flex-col gap-2 p-2 mt-auto border-t border-sidebar-border/60 bg-sidebar transition-colors duration-200', className)} {...props} />;
  }
);
SidebarFooter.displayName = 'SidebarFooter';

export const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} data-sidebar="group" className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} />;
  }
);
SidebarGroup.displayName = 'SidebarGroup';

export const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'> & { asChild?: boolean }>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        ref={ref}
        data-sidebar="group-label"
        className={cn(
          'flex h-7 shrink-0 items-center rounded-md px-2 text-[10px] font-bold tracking-wider uppercase text-sidebar-foreground/60 outline-none group-data-[collapsible=icon]:hidden',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

export const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} data-sidebar="group-content" className={cn('w-full text-sm', className)} {...props} />;
  }
);
SidebarGroupContent.displayName = 'SidebarGroupContent';

export const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => {
    return <ul ref={ref} data-sidebar="menu" className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />;
  }
);
SidebarMenu.displayName = 'SidebarMenu';

export const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
  ({ className, ...props }, ref) => {
    return <li ref={ref} data-sidebar="menu-item" className={cn('group/menu-item relative list-none', className)} {...props} />;
  }
);
SidebarMenuItem.displayName = 'SidebarMenuItem';

const sidebarMenuButtonVariants = cva(
  'peer/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-lg p-2 text-left text-xs font-medium outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        outline: 'bg-background shadow-xs hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      },
      size: {
        default: 'h-8 text-xs',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm font-semibold',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(({ asChild = false, isActive = false, variant = 'default', size = 'default', tooltip, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      ref={ref}
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        sidebarMenuButtonVariants({ variant, size }),
        isActive && 'bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 hover:text-primary-foreground',
        className
      )}
      {...props}
    />
  );

  if (!tooltip) {
    return button;
  }

  if (typeof tooltip === 'string') {
    tooltip = { children: tooltip };
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" hidden={state !== 'collapsed' || isMobile} {...tooltip} />
    </Tooltip>
  );
});
SidebarMenuButton.displayName = 'SidebarMenuButton';

export const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    asChild?: boolean;
    showOnHover?: boolean;
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        'absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-muted-foreground outline-none transition-transform hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-foreground [&>svg]:size-3.5 [&>svg]:shrink-0 cursor-pointer',
        showOnHover &&
          'peer-data-[active=true]/menu-button:text-foreground md:opacity-0 md:group-focus-within/menu-item:opacity-100 md:group-hover/menu-item:opacity-100',
        className
      )}
      {...props}
    />
  );
});
SidebarMenuAction.displayName = 'SidebarMenuAction';

export const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="menu-badge"
        className={cn(
          'pointer-events-none ml-auto flex h-5 min-w-5 select-none items-center justify-center rounded-full px-1.5 text-[10px] font-bold group-data-[collapsible=icon]:hidden',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarMenuBadge.displayName = 'SidebarMenuBadge';

export const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => {
    return (
      <ul
        ref={ref}
        data-sidebar="menu-sub"
        className={cn(
          'mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden list-none',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarMenuSub.displayName = 'SidebarMenuSub';

export const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('list-none', className)} {...props} />
);
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem';

export const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<'a'> & {
    asChild?: boolean;
    size?: 'sm' | 'md';
    isActive?: boolean;
  }
>(({ asChild = false, size = 'md', isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a';
  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 active:bg-accent active:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 text-xs transition-colors',
        isActive && 'bg-accent text-accent-foreground font-semibold',
        className
      )}
      {...props}
    />
  );
});
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton';
