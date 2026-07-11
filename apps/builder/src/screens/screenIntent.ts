import { SHADCN_REGISTRY_TYPES } from '@yukilabs/agnostic-ui-react';

const KNOWN_TYPES = new Set(SHADCN_REGISTRY_TYPES);
const BINDING = /\{\{[\s\S]*?\}\}/g;

/**
 * INTENÇÃO de uma tela (K5, análogo do flowIntent do I.4): o que a tela USA — os tipos
 * de componente, os bindings `{{ … }}` e a rota/dataFlow. É a base da revisão da
 * proposta da IA (não JSON cru).
 */
export interface ScreenIntent {
  /** Tipos de componente distintos usados (sorted). */
  types: string[];
  /** Tipos fora do `shadcnRegistry` — não renderizam (defensivo). */
  unknownTypes: string[];
  /** Expressões `{{ … }}` coletadas de props + dataBind (sorted, deduped). */
  bindings: string[];
  route: string;
  dataFlow: string;
}

function collectBindings(value: unknown, out: Set<string>): void {
  if (typeof value === 'string') {
    for (const match of value.match(BINDING) ?? []) out.add(match.trim());
  } else if (Array.isArray(value)) {
    for (const item of value) collectBindings(item, out);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectBindings(item, out);
  }
}

function walk(node: unknown, types: Set<string>, bindings: Set<string>): void {
  if (node === null || typeof node !== 'object') return;
  const n = node as {
    type?: unknown;
    props?: unknown;
    dataBind?: unknown;
    children?: unknown;
    body?: unknown;
  };
  if (typeof n.type === 'string') types.add(n.type);
  collectBindings(n.props, bindings);
  if (typeof n.dataBind === 'string') collectBindings(n.dataBind, bindings);
  const kids = Array.isArray(n.children) ? n.children : Array.isArray(n.body) ? n.body : [];
  for (const child of kids) walk(child, types, bindings);
}

const sorted = (set: Set<string>): string[] => [...set].sort((a, b) => a.localeCompare(b));

export function screenIntent(screen: unknown): ScreenIntent {
  const s = (screen ?? {}) as { root?: unknown; route?: unknown; dataFlow?: unknown };
  const types = new Set<string>();
  const bindings = new Set<string>();
  walk(s.root, types, bindings);
  return {
    types: sorted(types),
    unknownTypes: sorted(types).filter((type) => !KNOWN_TYPES.has(type)),
    bindings: sorted(bindings),
    route: typeof s.route === 'string' ? s.route : '',
    dataFlow: typeof s.dataFlow === 'string' ? s.dataFlow : '',
  };
}

export interface ScreenIntentDiff {
  addedTypes: string[];
  removedTypes: string[];
  addedBindings: string[];
  routeChanged: boolean;
  dataFlowChanged: boolean;
}

const missingFrom = (from: readonly string[], list: readonly string[]): string[] =>
  list.filter((value) => !from.includes(value));

export function diffScreenIntent(
  before: ScreenIntent | null,
  after: ScreenIntent,
): ScreenIntentDiff {
  return {
    addedTypes: missingFrom(before?.types ?? [], after.types),
    removedTypes: before === null ? [] : missingFrom(after.types, before.types),
    addedBindings: missingFrom(before?.bindings ?? [], after.bindings),
    routeChanged: before !== null && before.route !== after.route,
    dataFlowChanged: before !== null && before.dataFlow !== after.dataFlow,
  };
}
