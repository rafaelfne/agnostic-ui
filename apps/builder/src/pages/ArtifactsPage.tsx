import type { ReactElement, ReactNode } from 'react';
import {
  Blocks,
  CheckCircle2,
  FileEdit,
  Link2,
  MonitorSmartphone,
  Plus,
  Workflow,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ArtifactKind, ArtifactSummary } from '../api/types';
import { useBuilderClient } from '../api/useBuilderClient';
import { ArtifactsByTypeChart, PublicationChart } from '@/components/charts/ArtifactCharts';
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
import { useEffect, useState } from 'react';

const KIND_ICON: Record<ArtifactKind, ReactNode> = {
  flow: <Workflow className="size-4" />,
  screen: <MonitorSmartphone className="size-4" />,
  integration: <Blocks className="size-4" />,
  event: <Zap className="size-4" />,
  hook: <Link2 className="size-4" />,
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; artifacts: ArtifactSummary[] };

export function ArtifactsPage(): ReactElement {
  const client = useBuilderClient();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    client
      .listArtifacts()
      .then((artifacts) => {
        if (active) setState({ status: 'ready', artifacts });
      })
      .catch((caught: unknown) => {
        if (active)
          setState({
            status: 'error',
            message: caught instanceof Error ? caught.message : 'Error',
          });
      });
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
          onOpenFlow={(slug) => navigate(`/flows/${encodeURIComponent(slug)}`)}
        />
      )}
    </div>
  );
}

function DashboardBody({
  artifacts,
  onOpenFlow,
}: {
  artifacts: ArtifactSummary[];
  onOpenFlow: (slug: string) => void;
}): ReactElement {
  const { t } = useI18n();
  const kinds: ArtifactKind[] = ['flow', 'screen', 'integration', 'event', 'hook'];
  const byType = kinds
    .map((k) => ({ type: k, count: artifacts.filter((a) => a.kind === k).length }))
    .filter((d) => d.count > 0);
  const published = artifacts.filter((a) => a.publishedVersion !== null).length;
  const drafts = artifacts.length - published;
  const activeFlows = artifacts.filter((a) => a.kind === 'flow').length;

  const stats = [
    {
      label: t('dash.statTotal'),
      value: artifacts.length,
      icon: <Workflow className="size-[15px]" />,
      hue: 281,
    },
    {
      label: t('dash.statPublished'),
      value: published,
      icon: <CheckCircle2 className="size-[15px]" />,
      hue: 152,
    },
    {
      label: t('dash.statDrafts'),
      value: drafts,
      icon: <FileEdit className="size-[15px]" />,
      hue: 70,
    },
    {
      label: t('dash.statActive'),
      value: activeFlows,
      icon: <Workflow className="size-[15px]" />,
      hue: 281,
    },
  ];

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
          </Card>
        ))}
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-4.5">
          <div className="mb-1 flex items-start justify-between px-1.5 pt-1.5">
            <div>
              <h3 className="text-[15px] font-semibold">{t('dash.chartTypeTitle')}</h3>
              <p className="text-[12.5px] text-muted-foreground">{t('dash.chartTypeSub')}</p>
            </div>
            <Badge variant="outline" className="font-mono">
              Recharts · Bar
            </Badge>
          </div>
          <ArtifactsByTypeChart data={byType} />
        </Card>
        <Card className="p-4.5">
          <div className="mb-1 px-1.5 pt-1.5">
            <h3 className="text-[15px] font-semibold">{t('dash.chartPubTitle')}</h3>
            <p className="text-[12.5px] text-muted-foreground">{t('dash.chartPubSub')}</p>
          </div>
          <PublicationChart published={published} drafts={drafts} />
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2.5 border-b px-4 py-3.5">
          <h3 className="text-[15px] font-semibold">{t('dash.all')}</h3>
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
            {artifacts.map((a) => (
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
          <Skeleton key={i} className="h-[92px]" />
        ))}
      </div>
      <div className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
