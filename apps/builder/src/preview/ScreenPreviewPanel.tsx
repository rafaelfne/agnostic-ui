import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import { SduiRenderer, shadcnRegistry } from '@yukilabs/agnostic-ui-react';
import { type ReactElement, useState } from 'react';

import { Textarea } from '@/components/ui/textarea';

import { PreviewFrame, type Viewport } from './PreviewFrame';
import {
  DEFAULT_THEME_CHOICE,
  type ThemeChoice,
  ThemeSelector,
  ViewportToggle,
  resolveTheme,
} from './PreviewControls';

/** Parse tolerante do scope de amostra: objeto JSON ou `{}` com erro sinalizado. */
function parseScope(text: string): { scope: Record<string, unknown>; error: string | null } {
  if (text.trim() === '') return { scope: {}, error: null };
  try {
    const value = JSON.parse(text) as unknown;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return { scope: value as Record<string, unknown>, error: null };
    }
    return { scope: {}, error: 'os dados de amostra devem ser um objeto JSON' };
  } catch (caught) {
    return { scope: {}, error: caught instanceof Error ? caught.message : 'invalid JSON' };
  }
}

/**
 * Preview estático ao vivo (K4): renderiza o `root` da tela pelo `shadcnRegistry` com o
 * tema do tenant + viewport, resolvendo `{{ … }}` contra dados de amostra. É o "como
 * fica"; o "simular" (rodar o dataFlow) é o `SimulatePanel`.
 */
export function ScreenPreviewPanel({ root }: { root: TemplateNode }): ReactElement {
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(DEFAULT_THEME_CHOICE);
  const [viewport, setViewport] = useState<Viewport>('mobile');
  const [scopeText, setScopeText] = useState('{\n  "balance": { "value": "1.500,00" }\n}');

  const { scope, error } = parseScope(scopeText);
  const theme = resolveTheme(themeChoice);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-3">
        <ThemeSelector value={themeChoice} onChange={setThemeChoice} />
        <ViewportToggle value={viewport} onChange={setViewport} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-[repeating-linear-gradient(45deg,#fafafa,#fafafa_10px,#f4f4f5_10px,#f4f4f5_20px)]">
          <PreviewFrame viewport={viewport} theme={theme}>
            <SduiRenderer node={root} registry={shadcnRegistry} scope={scope} />
          </PreviewFrame>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            dados de amostra (JSON)
          </label>
          <Textarea
            value={scopeText}
            onChange={(e) => setScopeText(e.target.value)}
            rows={12}
            spellCheck={false}
            className="font-mono text-xs"
          />
          {error !== null && <p className="text-[11px] text-destructive">{error}</p>}
          <p className="text-[11px] leading-snug text-muted-foreground">
            Os bindings <code>{'{{ … }}'}</code> resolvem contra estes dados. O tema aplica os
            tokens do tenant via CSS vars.
          </p>
        </div>
      </div>
    </div>
  );
}
