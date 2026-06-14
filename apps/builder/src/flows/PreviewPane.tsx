import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import { SduiRenderer, shadcnRegistry } from '@yukilabs/agnostic-ui-react';
import { type ReactElement } from 'react';
import { AlertCircle, ChevronRight } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { useI18n } from '@/i18n/i18n';

/** A sample server-composed screen, rendered through the shadcn/Recharts registry. */
const SAMPLE_SCREEN: TemplateNode = {
  type: 'screen',
  children: [
    {
      type: 'stack',
      children: [
        { type: 'heading', props: { title: 'Your account', level: 2 } },
        { type: 'text', props: { text: 'Hi Rafael — here is your balance.', muted: true } },
      ],
    },
    {
      type: 'section',
      children: [
        { type: 'text', props: { text: 'Available balance', muted: true } },
        { type: 'heading', props: { title: 'R$ 12,480.55', level: 1 } },
        {
          type: 'chart',
          props: {
            kind: 'area',
            x: 'day',
            y: 'value',
            height: 160,
            data: [
              { day: 'Mon', value: 3 },
              { day: 'Tue', value: 5 },
              { day: 'Wed', value: 4 },
              { day: 'Thu', value: 6 },
              { day: 'Fri', value: 5 },
              { day: 'Sat', value: 7 },
              { day: 'Sun', value: 6.5 },
            ],
          },
        },
      ],
    },
    { type: 'button', props: { label: 'View full statement', variant: 'default' } },
  ],
};

const REGISTRY_ROWS: { type: string; maps: string }[] = [
  { type: 'screen', maps: 'root div + ThemeProvider (tenant tokens)' },
  { type: 'section', maps: 'Card / CardContent' },
  { type: 'stack', maps: 'flex column with gap' },
  { type: 'heading', maps: 'CardTitle / h1–h3 typography' },
  { type: 'text', maps: 'p / muted-foreground' },
  { type: 'button', maps: 'Button (variant via props)' },
  { type: 'image', maps: 'AspectRatio + img' },
  { type: 'chart', maps: 'Recharts (line / bar / area / pie)' },
];

/**
 * "Simulate" panel — the end-user screen the SDUI renderer produces from a
 * TemplateNode tree, using the dedicated `shadcnRegistry` (no raw-HTML fallback).
 */
export function PreviewPane(): ReactElement {
  const { t } = useI18n();
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2.5 border-b px-4 py-3">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400" />
            <span className="size-2.5 rounded-full bg-amber-400" />
            <span className="size-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="flex-1 text-center font-mono text-xs text-muted-foreground">
            {t('preview.topbar')}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-success">
            <span className="size-1.5 rounded-full bg-success" /> OK
          </span>
        </div>
        <div className="grid place-items-center bg-muted/40 p-8">
          <div className="w-full max-w-[400px] rounded-2xl border bg-background p-5 shadow-md">
            <SduiRenderer node={SAMPLE_SCREEN} registry={shadcnRegistry} />
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3.5">
        <Card className="p-4.5">
          <h3 className="mb-1 text-sm font-semibold">{t('preview.regTitle')}</h3>
          <p className="mb-3.5 text-xs leading-relaxed text-muted-foreground">
            {t('preview.regSub')}
          </p>
          <div className="flex flex-col gap-1">
            {REGISTRY_ROWS.map((r) => (
              <div
                key={r.type}
                className="flex items-center gap-2.5 rounded-md bg-muted/40 px-2.5 py-1.5"
              >
                <code className="min-w-23 font-mono text-xs font-semibold text-primary">
                  {r.type}
                </code>
                <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                <span className="text-xs">{r.maps}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border-destructive/25 bg-destructive/5 p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertCircle className="size-4" /> {t('preview.unknownTitle')}
          </div>
          <p className="text-xs leading-relaxed opacity-85">{t('preview.unknownBody')}</p>
        </Card>
      </div>
    </div>
  );
}
