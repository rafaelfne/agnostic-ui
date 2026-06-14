import { type FormEvent, type ReactElement, useEffect, useState } from 'react';
import { ChevronRight, Plus, Workflow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { ArtifactSummary } from '../api/types';
import { useBuilderClient } from '../api/useBuilderClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; flows: ArtifactSummary[] };

export function FlowsListPage(): ReactElement {
  const client = useBuilderClient();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [slug, setSlug] = useState('');

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    client
      .listArtifacts('flow')
      .then((flows) => {
        if (active) setState({ status: 'ready', flows });
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

  function onCreate(event: FormEvent): void {
    event.preventDefault();
    const trimmed = slug.trim();
    if (trimmed !== '') navigate(`/flows/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="mx-auto max-w-[980px] px-8 pb-14 pt-8">
      <div className="mb-5">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">{t('nav.flows')}</h1>
        <p className="text-sm text-muted-foreground">{t('flows.sub')}</p>
      </div>

      <Card className="mb-5 p-4.5">
        <form onSubmit={onCreate} className="flex items-end gap-2.5">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="slug" className="text-xs">
              {t('flows.newLabel')}{' '}
              <span className="font-normal text-muted-foreground">{t('flows.slug')}</span>
            </Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="get-balance"
              className="font-mono"
            />
          </div>
          <Button type="submit">
            <Plus className="size-4" /> {t('flows.open')}
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {state.status === 'loading' && (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}
        {state.status === 'error' && (
          <p role="alert" className="p-6 text-sm text-destructive">
            {state.message}
          </p>
        )}
        {state.status === 'ready' &&
          (state.flows.length === 0 ? (
            <p className="p-12 text-center text-sm text-muted-foreground">{t('flows.empty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('col.flow')}</TableHead>
                  <TableHead>{t('col.latest')}</TableHead>
                  <TableHead>{t('col.published')}</TableHead>
                  <TableHead>{t('col.status')}</TableHead>
                  <TableHead className="w-11" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.flows.map((flow) => (
                  <TableRow
                    key={flow.slug}
                    className="cursor-pointer"
                    onClick={() => navigate(`/flows/${encodeURIComponent(flow.slug)}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
                          <Workflow className="size-4" />
                        </span>
                        <span className="font-mono font-semibold">{flow.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">v{flow.latestVersion}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {flow.publishedVersion !== null ? `v${flow.publishedVersion}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={flow.publishedVersion !== null ? 'success' : 'warning'}>
                        {flow.publishedVersion !== null ? t('status.published') : t('status.draft')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <ChevronRight className="size-4" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
      </Card>
    </div>
  );
}
