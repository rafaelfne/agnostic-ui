import type { ReactElement } from 'react';
import { History } from 'lucide-react';

import type { ArtifactVersion } from '../api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/i18n/i18n';

export interface VersionsTableProps {
  versions: ArtifactVersion[];
  busy: boolean;
  /** Publicar exige o papel `publisher` (o gate real é server-side; aqui é UX). */
  mayPublish: boolean;
  onPublish: (version: number) => void;
}

/**
 * Histórico de versões de um artefato (draft/published + publicar/rollback) —
 * compartilhado entre os editores de flow e de tela (extraído do FlowEditorPage no K1).
 */
export function VersionsTable({
  versions,
  busy,
  mayPublish,
  onPublish,
}: VersionsTableProps): ReactElement {
  const { t } = useI18n();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2.5 border-b px-4 py-3.5">
        <History className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{t('editor.versions')}</h3>
      </div>
      {versions.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">—</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('col.version')}</TableHead>
              <TableHead>{t('col.status')}</TableHead>
              <TableHead>{t('col.created')}</TableHead>
              <TableHead className="text-right">{t('col.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => (
              <TableRow key={v.version}>
                <TableCell className="font-mono font-semibold">v{v.version}</TableCell>
                <TableCell>
                  <Badge variant={v.status === 'published' ? 'success' : 'warning'}>
                    {v.status === 'published' ? t('status.published') : t('status.draft')}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{v.createdAt}</TableCell>
                <TableCell className="text-right">
                  {v.status !== 'published' && (
                    <Button
                      variant="default"
                      size="sm"
                      disabled={busy || !mayPublish}
                      onClick={() => onPublish(v.version)}
                    >
                      {t('editor.publishThis')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
