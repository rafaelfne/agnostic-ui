import type { TenantTheme } from '@yukilabs/agnostic-ui-core';
import { ThemeProvider, themeToCssVars } from '@yukilabs/agnostic-ui-react';
import { Component, type CSSProperties, type ReactElement, type ReactNode } from 'react';

export type Viewport = 'mobile' | 'tablet' | 'fluid';

const VIEWPORT_WIDTH: Record<Viewport, string> = {
  mobile: '375px',
  tablet: '768px',
  fluid: '100%',
};

/** Error boundary local: um tipo desconhecido no registry estrito lança — mostra o erro
 *  amigável em vez de derrubar o editor. */
export class PreviewErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: unknown): { error: string } {
    return { error: error instanceof Error ? error.message : 'render error' };
  }
  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
          {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Moldura de preview compartilhada (K4): phone/tablet/fluid + tema do tenant aplicado
 * como CSS vars. Os componentes shadcn usam os tokens `--primary`/`--background` (valores
 * oklch/cor via `var()`), então sobrescrevê-los com as cores do tenant retematiza o
 * preview; `themeToCssVars` ainda expõe os `--tenant-*` do manual.
 */
export function PreviewFrame({
  viewport,
  theme,
  children,
}: {
  viewport: Viewport;
  theme: TenantTheme;
  children: ReactNode;
}): ReactElement {
  const style = {
    ...themeToCssVars(theme),
    '--primary': theme.primaryColor,
    '--ring': theme.primaryColor,
    ...(theme.secondaryColor ? { '--accent': theme.secondaryColor } : {}),
    ...(theme.backgroundColor ? { '--background': theme.backgroundColor } : {}),
    width: VIEWPORT_WIDTH[viewport],
  } as CSSProperties;

  return (
    <div className="flex justify-center overflow-auto p-6">
      <ThemeProvider theme={theme}>
        <div
          style={style}
          className="shrink-0 overflow-hidden rounded-[2rem] border-[6px] border-zinc-900 bg-background text-foreground shadow-xl"
        >
          <div className="flex h-6 items-center justify-center">
            <span className="h-4 w-20 rounded-full bg-zinc-900" />
          </div>
          <div className="min-h-[560px] p-4">
            <PreviewErrorBoundary>{children}</PreviewErrorBoundary>
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
