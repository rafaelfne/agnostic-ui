import type { ReactElement, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Blocks,
  ChevronRight,
  LayoutGrid,
  Link2,
  LogOut,
  MonitorSmartphone,
  Search,
  Workflow,
  Zap,
} from 'lucide-react';

import { useAuth } from '@/auth/AuthContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/i18n';
import { cn } from '@/lib/utils';

function NavItem({
  to,
  active,
  icon,
  label,
  badge,
}: {
  to: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  badge?: string;
}): ReactElement {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
        active ? 'bg-card text-primary shadow-sm' : 'text-foreground hover:bg-accent',
      )}
    >
      <span className="[&_svg]:size-[17px]">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-full bg-accent px-1.5 text-xs font-medium text-muted-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

function ComingSoonItem({ icon, label }: { icon: ReactNode; label: string }): ReactElement {
  return (
    <div className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground opacity-65">
      <span className="[&_svg]:size-[17px]">{icon}</span>
      <span className="flex-1">{label}</span>
    </div>
  );
}

/** Shared app shell: persistent sidebar + sticky topbar. Wraps every authenticated page. */
export function AppShell({ children }: { children: ReactNode }): ReactElement {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const onArtifacts = pathname === '/';
  const onFlows = pathname.startsWith('/flows');
  const onScreens = pathname.startsWith('/screens');

  const crumbs =
    pathname === '/'
      ? [t('dash.title')]
      : pathname === '/flows'
        ? [t('nav.workspace'), t('nav.flows')]
        : pathname.startsWith('/flows/')
          ? [t('nav.flows'), decodeURIComponent(pathname.split('/flows/')[1] ?? '')]
          : pathname === '/screens'
            ? [t('nav.workspace'), t('nav.screens')]
            : pathname.startsWith('/screens/')
              ? [t('nav.screens'), decodeURIComponent(pathname.split('/screens/')[1] ?? '')]
              : [t('dash.title')];

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-62 shrink-0 flex-col border-r bg-sidebar">
        <div className="flex items-center gap-2.5 border-b px-4 py-3.5">
          <div className="grid size-8 place-items-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground">
            A
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Agnostic UI</span>
            <span className="text-[11px] text-muted-foreground">{t('app.builderConsole')}</span>
          </div>
        </div>

        <div className="border-b p-3">
          <Button variant="outline" className="w-full justify-start gap-2 font-medium">
            <span className="grid size-[18px] place-items-center rounded-[5px] bg-gradient-to-br from-primary to-fuchsia-500 font-mono text-[9px] font-bold text-white">
              P
            </span>
            <span className="flex-1 text-left">partnerco</span>
            <ChevronRight className="size-3.5 rotate-90 text-muted-foreground" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <p className="px-2.5 pb-2 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t('nav.workspace')}
          </p>
          <div className="flex flex-col gap-0.5">
            <NavItem to="/" active={onArtifacts} icon={<LayoutGrid />} label={t('nav.artifacts')} />
            <NavItem
              to="/flows"
              active={onFlows}
              icon={<Workflow />}
              label={t('nav.flows')}
              badge="4"
            />
            <NavItem
              to="/screens"
              active={onScreens}
              icon={<MonitorSmartphone />}
              label={t('nav.screens')}
            />
          </div>
          <p className="px-2.5 pb-2 pt-5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t('nav.comingSoon')}
          </p>
          <div className="flex flex-col gap-0.5">
            <ComingSoonItem icon={<Blocks />} label={t('nav.integrations')} />
            <ComingSoonItem icon={<Zap />} label={t('nav.events')} />
            <ComingSoonItem icon={<Link2 />} label={t('nav.hooks')} />
          </div>
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-xs font-semibold text-white">
              RF
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium">Rafael Ferreira</div>
              <div className="text-[11px] text-muted-foreground">publisher</div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={signOut}
              aria-label={t('nav.signOut')}
            >
              <LogOut className="size-[15px]" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/85 px-5 backdrop-blur">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="size-3.5 text-border" />}
                <span
                  className={cn(
                    'truncate',
                    i === crumbs.length - 1 && 'font-semibold text-foreground',
                    i === crumbs.length - 1 && pathname.startsWith('/flows/') && 'font-mono',
                  )}
                >
                  {c}
                </span>
              </span>
            ))}
          </div>
          <div className="hidden items-center gap-2 rounded-md border bg-card px-2.5 text-sm text-muted-foreground md:flex md:h-9 md:w-56">
            <Search className="size-4" />
            <span className="flex-1">{t('topbar.search')}</span>
            <kbd className="rounded border bg-muted px-1.5 font-mono text-[11px]">⌘K</kbd>
          </div>
          <LanguageToggle />
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
