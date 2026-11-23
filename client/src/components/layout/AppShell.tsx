import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { ROLE_LABEL } from '@sop/shared';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/format';
import { navForRole } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  if (!user) return null;
  const groups = navForRole(user.role);

  return (
    <div className="flex h-full flex-col">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex h-16 items-center gap-2 border-b border-[#ededed] px-5"
      >
        <span className="grid size-7 place-items-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground">
          M
        </span>
        <span className="text-sm font-medium">
          MING <span className="font-normal text-muted-foreground">SOP Center</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
              {group.title}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors',
                    isActive
                      ? 'bg-[#D8F8E9] font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )
                }
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#ededed] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-xs font-medium">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-sm leading-4">{user.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {ROLE_LABEL[user.role]}
              {user.departmentName ? ` · ${user.departmentName}` : ''}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');

  if (!user) return null;

  // Halaman panduan berisi artikel + screenshot; di layar lebar kolom 1128px
  // menyisakan terlalu banyak ruang kosong, jadi kanvasnya dilebarkan.
  const wide = pathname.startsWith('/panduan');

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-[#ededed] bg-background lg:block">
        <SidebarContent />
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-[#ededed] bg-background/95 px-4 backdrop-blur lg:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka navigasi">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[248px] p-0">
              <SheetTitle className="sr-only">Navigasi</SheetTitle>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <form
            className="relative ml-auto w-full max-w-xs"
            onSubmit={(event) => {
              event.preventDefault();
              const q = query.trim();
              navigate(q ? `/sop?q=${encodeURIComponent(q)}` : '/sop');
            }}
          >
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari SOP, kode, atau kata kunci…"
              aria-label="Cari SOP"
              className="pl-9"
            />
          </form>

          <Button variant="ghost" size="icon" aria-label="Notifikasi">
            <Bell className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-secondary"
                aria-label={`Menu pengguna ${user.name}`}
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-secondary text-xs font-medium">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <span className="block text-sm">{user.name}</span>
                <span className="block text-xs text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="size-4" aria-hidden />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main
          className={cn(
            'mx-auto w-full px-4 py-6 lg:px-8',
            wide ? 'max-w-[1128px] xl:max-w-[1320px] 2xl:max-w-[1400px]' : 'max-w-[1128px]',
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
