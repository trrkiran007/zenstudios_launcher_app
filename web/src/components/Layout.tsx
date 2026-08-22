import {
  BarChart3, Boxes, Building2, FileText, LayoutDashboard, Menu, Receipt,
  ScanSearch, Settings, Wallet, X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../lib/app-context';
import { cx } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/quotations', label: 'Quotations', icon: FileText },
  { to: '/projects', label: 'Projects', icon: Boxes },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

const LIBRARY = [
  { to: '/clients', label: 'Clients', icon: Building2 },
  { to: '/catalog', label: 'Rate card & products', icon: Boxes },
  { to: '/benchmark', label: 'Market benchmark', icon: ScanSearch },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function Brand() {
  const { org } = useApp();
  const logo = org?.logoPath ? `/api/settings/organization/logo-file?v=${encodeURIComponent(org.logoPath)}` : null;
  const brand = org?.brandName ?? 'ZenStudios';
  const [first, ...rest] = brand.split(/(?=[A-Z])/);

  return (
    <div className="flex items-center gap-2.5 px-4 py-4">
      {logo ? (
        <img src={logo} alt={brand} className="h-8 max-w-[150px] object-contain" />
      ) : (
        <>
          <div
            className="flex size-8 items-center justify-center rounded-lg text-sm font-black text-white"
            style={{ background: org?.brandColor ?? '#16A34A' }}
          >
            {brand[0]}
          </div>
          <div className="text-[15px] leading-none font-extrabold tracking-tight">
            <span className="text-slate-900">{first}</span>
            <span style={{ color: org?.brandColor ?? '#16A34A' }}>{rest.join('')}</span>
            <sup className="ml-0.5 text-[8px] font-semibold text-slate-400">™</sup>
          </div>
        </>
      )}
    </div>
  );
}

function NavSection({ items, label }: { items: typeof NAV; label?: string }) {
  return (
    <div className="px-2 py-1">
      {label && (
        <p className="px-2 pt-3 pb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          {label}
        </p>
      )}
      <nav className="space-y-0.5">
        {items.map(({ to, label: text, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <Icon className="size-[18px] shrink-0" />
            {text}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const { org, system } = useApp();

  return (
    <div className="flex min-h-full flex-col">
      {/* macOS: the window has no native title bar, so this strip is what you
          drag it by. The left inset clears the traffic lights. */}
      {system?.desktop && (
        <div className="app-drag flex h-9 shrink-0 items-center border-b border-slate-200 bg-slate-50 pl-20">
          <span className="text-[11px] font-medium text-slate-400 select-none">
            {org?.brandName ?? 'ZenStudios'}
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
      {/* Mobile scrim */}
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button className="mr-3 rounded-md p-1 text-slate-400 lg:hidden" onClick={() => setOpen(false)}>
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-4" onClick={() => setOpen(false)}>
          <NavSection items={NAV} />
          <NavSection items={LIBRARY} label="Library" />
        </div>

        <div className="border-t border-slate-100 px-4 py-3">
          <p className="truncate text-[11px] leading-snug font-medium text-slate-600">{org?.legalName}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {org?.gstin ? `GSTIN ${org.gstin}` : 'GSTIN not set'}
          </p>
          {system?.appVersion && (
            <p className="mt-1.5 text-[10px] text-slate-400">
              Version {system.appVersion}
              {system.desktop ? '' : ' · browser'}
            </p>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
            <Menu className="size-5" />
          </button>
          <span className="text-sm font-semibold">{org?.brandName ?? 'ZenStudios'}</span>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
