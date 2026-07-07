import type { TenantTheme } from '@yukilabs/agnostic-ui-core';
import { type ReactElement } from 'react';

import { cn } from '@/lib/utils';

import { type Viewport } from './PreviewFrame';
import { SAMPLE_THEMES, customTheme } from './sampleThemes';

export interface ThemeChoice {
  id: string;
  custom: { primary: string; secondary: string; background: string };
}

const FALLBACK_THEME: TenantTheme = { primaryColor: '#6D28D9' };

/** Resolve o tema (preset ou custom) a partir da escolha. */
export function resolveTheme(choice: ThemeChoice): TenantTheme {
  if (choice.id === 'custom') {
    return customTheme(choice.custom.primary, choice.custom.secondary, choice.custom.background);
  }
  return SAMPLE_THEMES.find((t) => t.id === choice.id)?.theme ?? FALLBACK_THEME;
}

export const DEFAULT_THEME_CHOICE: ThemeChoice = {
  id: 'partnerco',
  custom: { primary: '#6D28D9', secondary: '#9333EA', background: '#ffffff' },
};

/** Chips de tema (partnerco/acme/custom) + color pickers no modo custom. */
export function ThemeSelector({
  value,
  onChange,
}: {
  value: ThemeChoice;
  onChange: (next: ThemeChoice) => void;
}): ReactElement {
  const chip = (id: string, label: string, dot: string): ReactElement => (
    <button
      key={id}
      type="button"
      onClick={() => onChange({ ...value, id })}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        value.id === id
          ? 'border-zinc-400 bg-zinc-100 text-zinc-900'
          : 'border-border text-muted-foreground',
      )}
    >
      <span className="size-2 rounded-full" style={{ background: dot }} /> {label}
    </button>
  );
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        tema
      </span>
      {chip('partnerco', 'partnerco', '#6D28D9')}
      {chip('acme', 'acme', '#0284C7')}
      {chip('custom', 'custom', value.custom.primary)}
      {value.id === 'custom' && (
        <div className="flex items-center gap-1">
          {(['primary', 'secondary', 'background'] as const).map((key) => (
            <input
              key={key}
              type="color"
              aria-label={key}
              value={value.custom[key]}
              onChange={(e) =>
                onChange({ ...value, custom: { ...value.custom, [key]: e.target.value } })
              }
              className="size-6 cursor-pointer rounded border border-border bg-transparent"
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Toggle de viewport (375 / 768 / fluido). */
export function ViewportToggle({
  value,
  onChange,
}: {
  value: Viewport;
  onChange: (next: Viewport) => void;
}): ReactElement {
  const opt = (v: Viewport, label: string): ReactElement => (
    <button
      key={v}
      type="button"
      onClick={() => onChange(v)}
      className={cn(
        'rounded-md px-2 py-1 text-xs font-medium',
        value === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-muted-foreground',
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-0.5">
      {opt('mobile', '375')}
      {opt('tablet', '768')}
      {opt('fluid', 'fluido')}
    </div>
  );
}
