import {
  Blocks,
  CheckCircle2,
  Component,
  FileEdit,
  Link2,
  MonitorSmartphone,
  Plus,
  Puzzle,
  Workflow,
  Zap,
} from 'lucide-react';
import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ArtifactKind, ArtifactSummary } from '../api/types';
import { useBuilderClient } from '../api/useBuilderClient';
import { validateFlow } from '../flows/flowModel';
import {
  ArtifactsByTypeChart,
  PublicationChart,
  PublishActivityChart,
} from '@/components/charts/ArtifactCharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/i18n/i18n';
import { cn } from '@/lib/utils';

const KINDS: ArtifactKind[] = [
  'flow',
  'screen',
  'integration',
  'event',
  'hook',
  'operator',
  'component',
];

const KIND_ICON: Record<ArtifactKind, ReactNode> = {
  flow: <Workflow className="size-4" />,
  screen: <MonitorSmartphone className="size-4" />,
  integration: <Blocks className="size-4" />,
  event: <Zap className="size-4" />,
  hook: <Link2 className="size-4" />,
  operator: <Puzzle className="size-4" />,
  component: <Component className="size-4" />,
};

type Ready = { status: 'ready'; artifacts: ArtifactSummary[]; withIssue: number };
type LoadState = { status: 'loading' } | { status: 'error'; message: string } | Ready;

export function ArtifactsPage(): ReactElement {
  const client = useBuilderClient();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void (async () => {
      try {
        const artifacts = await client.listArtifacts();
        // "with issue" = flows whose latest version body fails the engine schema.
        const flows = artifacts.filter((a) => a.kind === 'flow');
        const flags = await Promise.all(
          flows.map(async (f) => {
            try {
              const versions = await client.listVersions('flow', f.slug);
              const body = versions[0]?.body;
              return body !== undefined && !validateFlow(body).ok;
            } catch {
              return false;
            }
          }),
        );
        if (active)
          setState({ status: 'ready', artifacts, withIssue: flags.filter(Boolean).length });
      } catch (caught) {
        if (active)
          setState({
            status: 'error',
            message: caught instanceof Error ? caught.message : 'Error',
          });
      }
    })();
    return () => {
      active = false;
    };
  }, [client]);

  return (
    <div className="mx-auto max-w-[1180px] px-8 pb-14 pt-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">{t('dash.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('dash.subPre')} <strong className="font-semibold text-foreground">partnerco</strong>{' '}
            {t('dash.subPost')}
          </p>
        </div>
        <Button onClick={() => navigate('/flows')}>
          <Plus className="size-4" /> {t('dash.newFlow')}
        </Button>
      </div>

      {state.status === 'loading' && <DashboardSkeleton />}
      {state.status === 'error' && (
        <Card
          className="border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive"
          role="alert"
        >
          {state.message}
        </Card>
      )}
      {state.status === 'ready' && (
        <DashboardBody
          artifacts={state.artifacts}
          withIssue={state.withIssue}
          onOpenFlow={(slug) => navigate(`/flows/${encodeURIComponent(slug)}`)}
        />
      )}
    </div>
  );
}

function weekdayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function DashboardBody({
  artifacts,
  withIssue,
  onOpenFlow,
}: {
  artifacts: ArtifactSummary[];
  withIssue: number;
  onOpenFlow: (slug: string) => void;
}): ReactElement {
  const { t } = useI18n();
  const [filter, setFilter] = useState<'all' | ArtifactKind>('all');

  const total = artifacts.length;
  const published = artifacts.filter((a) => a.publishedVersion !== null).length;
  const drafts = total - published;
  const activeFlows = artifacts.filter((a) => a.kind === 'flow').length;
  const pct = total > 0 ? Math.round((published / total) * 100) : 0;

  const weekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = artifacts.filter((a) => new Date(a.createdAt).getTime() >= weekAgo).length;

  const byType = KINDS.map((k) => ({
    type: k,
    count: artifacts.filter((a) => a.kind === k).length,
  }));

  const publishes7d = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86_400_000);
      return { key: d.toISOString().slice(0, 10), day: weekdayLabel(d), count: 0 };
    });
    for (const a of artifacts) {
      if (a.publishedAt === null) continue;
      const key = a.publishedAt.slice(0, 10);
      const bucket = days.find((d) => d.key === key);
      if (bucket) bucket.count += 1;
    }
    return days.map(({ day, count }) => ({ day, count }));
  }, [artifacts]);

  const stats = [
    {
      label: t('dash.statTotal'),
      value: total,
      sub: t('dash.statTotalSub', { n: thisWeek }),
      icon: <Workflow className="size-[15px]" />,
      hue: 281,
    },
    {
      label: t('dash.statPublished'),
      value: published,
      sub: t('dash.statPublishedSub', { pct }),
      icon: <CheckCircle2 className="size-[15px]" />,
      hue: 152,
    },
    {
      label: t('dash.statDrafts'),
      value: drafts,
      sub: t('dash.statDraftsSub'),
      icon: <FileEdit className="size-[15px]" />,
      hue: 70,
    },
    {
      label: t('dash.statActive'),
      value: activeFlows,
      sub: t('dash.statActiveSub', { n: withIssue }),
      icon: <Workflow className="size-[15px]" />,
      hue: 281,
    },
  ];

  const rows = (filter === 'all' ? artifacts : artifacts.filter((a) => a.kind === filter))
    .slice()
    .sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.slug.localeCompare(b.slug));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12.5px] font-medium text-muted-foreground">{s.label}</span>
              <span
                className="grid size-7 place-items-center rounded-lg"
                style={{
                  background: `oklch(0.55 0.18 ${s.hue} / 0.12)`,
                  color: `oklch(0.55 0.18 ${s.hue})`,
                }}
              >
                {s.icon}
              </span>
            </div>
            <span className="text-3xl font-semibold tracking-tight tabular-nums">{s.value}</span>
            <span className="mt-0.5 block text-[12px] text-muted-foreground">{s.sub}</span>
          </Card>
        ))}
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-4.5">
          <div className="mb-1 px-1.5 pt-1.5">
            <h3 className="text-[15px] font-semibold">{t('dash.chartTypeTitle')}</h3>
            <p className="text-[12.5px] text-muted-foreground">{t('dash.chartTypeSub')}</p>
          </div>
          <ArtifactsByTypeChart data={byType} />
        </Card>

        <Card className="p-4.5">
          <div className="mb-1 px-1.5 pt-1.5">
            <h3 className="text-[15px] font-semibold">{t('dash.chartPubTitle')}</h3>
            <p className="text-[12.5px] text-muted-foreground">{t('dash.chartPubSub')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <PublicationChart published={published} drafts={drafts} />
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-2xl font-semibold tabular-nums">{total}</div>
                  <div className="text-[11px] text-muted-foreground">{t('dash.pubCenter')}</div>
                </div>
              </div>
            </div>
            <ul className="flex shrink-0 flex-col gap-2 pr-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: 'var(--success)' }} />
                <span className="font-semibold tabular-nums">{published}</span>
                <span className="text-muted-foreground">{t('dash.statPublished')}</span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: 'var(--chart-muted)' }}
                />
                <span className="font-semibold tabular-nums">{drafts}</span>
                <span className="text-muted-foreground">{t('dash.statDrafts')}</span>
              </li>
            </ul>
          </div>
        </Card>
      </div>

      <Card className="p-4.5">
        <div className="mb-1 px-1.5 pt-1.5">
          <h3 className="text-[15px] font-semibold">{t('dash.chartAreaTitle')}</h3>
          <p className="text-[12.5px] text-muted-foreground">{t('dash.chartAreaSub')}</p>
        </div>
        <PublishActivityChart data={publishes7d} />
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 border-b px-4 py-3.5">
          <h3 className="mr-auto text-[15px] font-semibold">{t('dash.all')}</h3>
          <div className="flex flex-wrap gap-1">
            {(['all', ...KINDS] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent',
                )}
              >
                {f === 'all' ? t('dash.filterAll') : f}
              </button>
            ))}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('col.artifact')}</TableHead>
              <TableHead>{t('col.type')}</TableHead>
              <TableHead>{t('col.version')}</TableHead>
              <TableHead>{t('col.published')}</TableHead>
              <TableHead className="text-right">{t('col.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow
                key={`${a.kind}:${a.slug}`}
                className={a.kind === 'flow' ? 'cursor-pointer' : ''}
                onClick={a.kind === 'flow' ? () => onOpenFlow(a.slug) : undefined}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
                      {KIND_ICON[a.kind]}
                    </span>
                    <span className="font-mono font-medium">{a.slug}</span>
                  </div>
                </TableCell>
                <TableCell className="capitalize text-muted-foreground">{a.kind}</TableCell>
                <TableCell className="font-mono">v{a.latestVersion}</TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {a.publishedVersion !== null ? `v${a.publishedVersion}` : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={a.publishedVersion !== null ? 'success' : 'warning'}>
                    {a.publishedVersion !== null ? t('status.published') : t('status.draft')}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function DashboardSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
      <div className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-56" />
      <Skeleton className="h-72" />
    </div>
  );
}
