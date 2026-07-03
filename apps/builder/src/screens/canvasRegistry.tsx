import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import {
  type ComponentRegistry,
  SHADCN_REGISTRY_TYPES,
  type SduiComponent,
  shadcnRegistry,
} from '@yukilabs/agnostic-ui-react';
import { Children, type ReactElement, type ReactNode, createElement, useState } from 'react';
import { Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import { childrenOf } from './nodePath';
import { CONTAINER_TYPES } from './screenVocabulary';

/** Payloads do drag nativo: um tipo novo (da paleta) ou o path de um nó existente (mover). */
export const NEW_MIME = 'application/x-sdui-new';
export const PATH_MIME = 'application/x-sdui-path';

export interface CanvasContext {
  pathIndex: WeakMap<TemplateNode, string>;
  selectedPath: string | null;
  /** `null` deseleciona (clique no fundo do canvas). */
  onSelect: (path: string | null) => void;
  onRemove: (path: string) => void;
  /** Insere em `(parentPath, index)` a partir do payload (tipo novo OU path movido). */
  onDrop: (data: DataTransfer, parentPath: string, index: number) => void;
}

const stop = (event: { preventDefault: () => void; stopPropagation: () => void }): void => {
  event.preventDefault();
  event.stopPropagation();
};

/** Barra fina de inserção entre irmãos; expande e mostra "solte aqui" no dragover. */
function DropZone({
  parentPath,
  index,
  ctx,
}: {
  parentPath: string;
  index: number;
  ctx: CanvasContext;
}): ReactElement {
  const [over, setOver] = useState(false);
  return (
    <div
      data-canvas-dropzone
      onClick={(e) => e.stopPropagation()}
      onDragOver={(e) => {
        stop(e);
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        stop(e);
        setOver(false);
        ctx.onDrop(e.dataTransfer, parentPath, index);
      }}
      className={cn('flex items-center transition-all', over ? '-my-0.5 h-6' : '-my-1 h-2')}
    >
      {over && (
        <div className="flex h-2 w-full items-center justify-center rounded border border-dashed border-violet-400 bg-violet-200/60">
          <span className="text-[10px] font-medium text-violet-700">solte aqui</span>
        </div>
      )}
    </div>
  );
}

/** Placeholder de container vazio — a caixa tracejada "arraste um componente aqui". */
function EmptyDrop({ parentPath, ctx }: { parentPath: string; ctx: CanvasContext }): ReactElement {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        stop(e);
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        stop(e);
        setOver(false);
        ctx.onDrop(e.dataTransfer, parentPath, 0);
      }}
      className={cn(
        'grid min-h-[92px] place-items-center rounded-lg border-2 border-dashed text-xs transition-colors',
        over
          ? 'border-violet-400 bg-violet-50 text-violet-700'
          : 'border-zinc-300 bg-zinc-50/60 text-zinc-400',
      )}
    >
      arraste um componente aqui
    </div>
  );
}

/** Intercala dropzones entre os filhos renderizados (ou o placeholder de vazio). */
function withDropZones(
  children: ReactNode,
  parentPath: string,
  count: number,
  ctx: CanvasContext,
): ReactNode {
  if (count === 0) return <EmptyDrop parentPath={parentPath} ctx={ctx} />;
  const kids = Children.toArray(children);
  const out: ReactNode[] = [<DropZone key="dz-0" parentPath={parentPath} index={0} ctx={ctx} />];
  kids.forEach((kid, i) => {
    out.push(kid);
    out.push(<DropZone key={`dz-${i + 1}`} parentPath={parentPath} index={i + 1} ctx={ctx} />);
  });
  return out;
}

/**
 * Chrome de edição em volta de cada nó: anel de seleção (box-shadow — sem deslocar
 * layout), chip do tipo, lixeira e o alvo de drag/seleção. A seleção usa CAPTURE +
 * `closest('[data-node-path]') === currentTarget`: o nó MAIS INTERNO vence e o clique é
 * pré-empitado antes de Recharts/`<button>` (que engolem o bubble).
 */
function NodeChrome({
  path,
  type,
  selected,
  ctx,
  children,
}: {
  path: string;
  type: string;
  selected: boolean;
  ctx: CanvasContext;
  children: ReactNode;
}): ReactElement {
  return (
    <div
      data-node-path={path}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData(PATH_MIME, path);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClickCapture={(e) => {
        const target = e.target as HTMLElement;
        // Controles (lixeira) e dropzones tratam o próprio clique — não selecionam o nó.
        if (target.closest('[data-canvas-control],[data-canvas-dropzone]')) return;
        if (target.closest('[data-node-path]') === e.currentTarget) {
          stop(e);
          ctx.onSelect(path);
        }
      }}
      className={cn(
        'relative rounded-[3px]',
        selected
          ? 'shadow-[0_0_0_2px_var(--tenant-accent,#6D28D9)]'
          : 'cursor-pointer hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-dashed hover:outline-zinc-400',
      )}
    >
      {selected && (
        <>
          <span className="absolute -top-3 left-2 z-20 flex items-center rounded-md bg-[var(--tenant-accent,#6D28D9)] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            {type}
          </span>
          <button
            type="button"
            data-canvas-control
            onClick={(e) => {
              e.stopPropagation();
              ctx.onRemove(path);
            }}
            className="absolute -top-3 right-2 z-20 grid size-6 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:border-red-200 hover:text-red-600"
            aria-label="Remover nó"
          >
            <Trash2 className="size-3.5" />
          </button>
        </>
      )}
      {children}
    </div>
  );
}

function makeCanvasComponent(
  type: string,
  base: SduiComponent | null,
  ctx: CanvasContext,
): SduiComponent {
  function CanvasNode({ node, props, children }: Parameters<SduiComponent>[0]): ReactNode {
    const path = ctx.pathIndex.get(node) ?? '';
    const isContainer = CONTAINER_TYPES.has(type);
    const inner =
      base === null ? (
        <span className="inline-block rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs text-red-600">
          ? {type}
        </span>
      ) : (
        createElement(base, {
          node,
          props,
          children: isContainer
            ? withDropZones(children, path, childrenOf(node).length, ctx)
            : children,
        })
      );
    return (
      <NodeChrome path={path} type={type} selected={ctx.selectedPath === path} ctx={ctx}>
        {inner}
      </NodeChrome>
    );
  }
  return CanvasNode;
}

/**
 * Registry de EDIÇÃO (K2): decora cada componente do `shadcnRegistry` com o chrome de
 * canvas, sem tocar no pacote `react`. É um Proxy (como o shadcn) para que qualquer
 * tipo — inclusive desconhecido → chip vermelho selecionável — receba um wrapper; o
 * preview (fora do canvas) continua usando o `shadcnRegistry` estrito.
 */
export function createCanvasRegistry(ctx: CanvasContext): ComponentRegistry {
  const cache = new Map<string, SduiComponent>();
  const known = new Set(SHADCN_REGISTRY_TYPES);
  return new Proxy({} as ComponentRegistry, {
    has: () => true,
    get: (_target, prop) => {
      if (typeof prop !== 'string') return undefined;
      let component = cache.get(prop);
      if (component === undefined) {
        const base = known.has(prop) ? (shadcnRegistry[prop] as SduiComponent) : null;
        component = makeCanvasComponent(prop, base, ctx);
        cache.set(prop, component);
      }
      return component;
    },
  });
}
