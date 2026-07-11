import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import { SduiRenderer } from '@yukilabs/agnostic-ui-react';
import { type CSSProperties, type ReactElement, useMemo } from 'react';

import { type CanvasContext, createCanvasRegistry } from './canvasRegistry';

/**
 * Canvas WYSIWYG (K2): renderiza a árvore real da tela através do `shadcnRegistry`
 * decorado com o chrome de edição, num phone frame 375 sobre um fundo pontilhado.
 * Clique no fundo (fora de qualquer nó) deseleciona.
 */
export function ScreenCanvas({
  ctx,
  root,
}: {
  ctx: CanvasContext;
  root: TemplateNode;
}): ReactElement {
  const registry = useMemo(() => createCanvasRegistry(ctx), [ctx]);
  return (
    <div
      onClick={() => ctx.onSelect(null)}
      style={{ '--tenant-accent': '#6D28D9', backgroundSize: '18px 18px' } as CSSProperties}
      className="relative flex flex-1 justify-center overflow-auto bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] p-8"
    >
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full border bg-white/90 px-2.5 py-1 text-[11px] text-zinc-600 shadow-sm">
        <span className="size-2 rounded-full bg-[var(--tenant-accent)]" /> partnerco · mobile 375
      </div>
      <div className="h-fit w-[375px] shrink-0 overflow-hidden rounded-[2.5rem] border-[6px] border-zinc-900 bg-white shadow-xl">
        <div className="flex h-6 items-center justify-center">
          <span className="h-4 w-20 rounded-full bg-zinc-900" />
        </div>
        <div className="min-h-[620px] px-4 pb-6 pt-1">
          <SduiRenderer node={root} registry={registry} />
        </div>
      </div>
    </div>
  );
}
