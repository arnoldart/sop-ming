import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROLE_LABEL } from '@sop/shared';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';
import {
  IconBell,
  IconChevronDown,
  IconDoc,
  IconFlag,
  IconGrid,
  IconHistory,
  IconLogout,
  IconMegaphone,
  IconSearch,
  IconUsers,
} from './Icons';

interface NavItem {
  to: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactElement;
  roles?: string[];
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: IconGrid },
  { to: '/sops', label: 'Perpustakaan SOP', icon: IconDoc },
  { to: '/announcements', label: 'Pengumuman', icon: IconMegaphone },
  { to: '/reports', label: 'Laporan', icon: IconFlag },
];

const OTHER_NAV: NavItem[] = [
  { to: '/audit-logs', label: 'Audit Log', icon: IconHistory, roles: ['AUDITOR', 'HRD'] },
  { to: '/users', label: 'Pengguna', icon: IconUsers, roles: ['AUDITOR', 'HRD'] },
];

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'group flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[14px] transition-colors',
          isActive
            ? 'bg-primary-soft font-medium text-ink'
            : 'text-ink-mute hover:bg-canvas-soft hover:text-ink',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={isActive ? 'h-4 w-4 text-primary-deep' : 'h-4 w-4'} />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [otherOpen, setOtherOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const visibleOther = OTHER_NAV.filter((item) => !item.roles || item.roles.includes(user.role));

  const sidebar = (
    <div className="flex h-full w-[248px] shrink-0 flex-col border-r border-hairline bg-canvas">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="grid h-7 w-7 place-items-center rounded-sm bg-primary text-[13px] font-medium text-on-primary">
          M
        </span>
        <div className="leading-tight">
          <p className="text-[14px] font-medium text-ink">MING SOP Center</p>
          <p className="text-[11px] text-ink-mute-2">Pengelolaan SOP</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4" aria-label="Navigasi utama">
        <p className="px-2.5 pt-3 pb-1.5 text-[11px] font-medium tracking-wide text-ink-mute-2 uppercase">
          Menu utama
        </p>
        <div className="flex flex-col gap-0.5">
          {MAIN_NAV.map((item) => (
            <NavRow key={item.to} item={item} onNavigate={() => setMobileOpen(false)} />
          ))}
        </div>

        {visibleOther.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setOtherOpen((v) => !v)}
              aria-expanded={otherOpen}
              className="mt-4 flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] font-medium tracking-wide text-ink-mute-2 uppercase"
            >
              Lainnya
              <IconChevronDown className={`h-3.5 w-3.5 transition-transform ${otherOpen ? '' : '-rotate-90'}`} />
            </button>
            {otherOpen && (
              <div className="flex flex-col gap-0.5">
                {visibleOther.map((item) => (
                  <NavRow key={item.to} item={item} onNavigate={() => setMobileOpen(false)} />
                ))}
              </div>
            )}
          </>
        )}
      </nav>

      <div className="border-t border-hairline p-2.5">
        <div className="flex items-center gap-2.5 rounded-sm px-2 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-canvas-soft text-[12px] font-medium text-ink">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
            <p className="truncate text-[11px] text-ink-mute">
              {ROLE_LABEL[user.role]}
              {user.departmentName ? ` · ${user.departmentName}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            title="Keluar"
            aria-label="Keluar"
            className="grid h-8 w-8 place-items-center rounded-sm text-ink-mute-2 hover:bg-canvas-soft hover:text-ink"
          >
            <IconLogout />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-canvas-soft">
      <div className="hidden lg:block">{sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-ink/20" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="relative z-10 h-full overscroll-contain shadow-l3">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-canvas px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="btn btn-ghost h-9 w-9 p-0 lg:hidden"
            aria-label="Buka menu"
          >
            <IconGrid />
          </button>

          <form
            className="relative max-w-md flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(query ? `/sops?q=${encodeURIComponent(query)}` : '/sops');
            }}
            role="search"
          >
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ink-mute-2" />
            <input
              className="input h-9 pl-8"
              placeholder="Cari SOP, kode, atau kata kunci…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Cari SOP"
            />
          </form>

          <div className="ml-auto flex items-center gap-1">
            <button type="button" className="btn btn-ghost h-9 w-9 p-0" aria-label="Notifikasi">
              <IconBell />
            </button>
            <div className="ml-1 flex items-center gap-2 border-l border-hairline pl-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-canvas-soft text-[11px] font-medium text-ink">
                {initials(user.name)}
              </span>
              <span className="hidden text-[13px] text-ink-mute sm:block">{ROLE_LABEL[user.role]}</span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
