import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import {
  BarChart3,
  CreditCard,
  Heading,
  Image,
  List,
  type LucideIcon,
  Minus,
  MousePointerClick,
  Rows2,
  Rows3,
  Smartphone,
  StretchVertical,
  Tag,
  TrendingUp,
  Type,
} from 'lucide-react';

/** Um campo do inspector, dirigido pelo tipo do componente (análogo ao StepEditor por op). */
export interface PropField {
  name: string;
  label: string;
  /** `expression`: aceita literal OU `{{ … }}` (destaca binding). `json`: editor cru. */
  kind: 'string' | 'number' | 'boolean' | 'select' | 'expression' | 'json';
  options?: Array<string | number>;
  placeholder?: string;
}

export type VocabGroup = 'Layout' | 'Conteúdo' | 'Dados';

export interface VocabEntry {
  type: string;
  label: string;
  group: VocabGroup;
  icon: LucideIcon;
  /** Aceita filhos (recebe dropzones + placeholder de vazio no canvas). */
  isContainer: boolean;
  /** Nó recém-criado ao arrastar/clicar da paleta. */
  defaultNode: () => TemplateNode;
  propFields: PropField[];
}

/**
 * Catálogo do vocabulário visual (K2) — dirige a paleta e o `NodeInspector`. Cobre os
 * tipos hoje mapeados no `shadcnRegistry` (`SHADCN_REGISTRY_TYPES`); o K3 acrescenta
 * card/kpi/badge/divider/list/list-item aqui + no renderer + na conformância.
 */
export const VOCABULARY: readonly VocabEntry[] = [
  {
    type: 'screen',
    label: 'Screen',
    group: 'Layout',
    icon: Smartphone,
    isContainer: true,
    defaultNode: () => ({ type: 'screen', children: [] }),
    propFields: [],
  },
  {
    type: 'section',
    label: 'Section',
    group: 'Layout',
    icon: Rows3,
    isContainer: true,
    defaultNode: () => ({ type: 'section', children: [] }),
    propFields: [],
  },
  {
    type: 'stack',
    label: 'Stack',
    group: 'Layout',
    icon: StretchVertical,
    isContainer: true,
    defaultNode: () => ({ type: 'stack', children: [] }),
    propFields: [
      { name: 'direction', label: 'direction', kind: 'select', options: ['column', 'row'] },
      { name: 'gap', label: 'gap', kind: 'number' },
    ],
  },
  {
    type: 'heading',
    label: 'Heading',
    group: 'Conteúdo',
    icon: Heading,
    isContainer: false,
    defaultNode: () => ({ type: 'heading', props: { title: 'Título' } }),
    propFields: [{ name: 'title', label: 'title', kind: 'expression', placeholder: 'Título' }],
  },
  {
    type: 'text',
    label: 'Text',
    group: 'Conteúdo',
    icon: Type,
    isContainer: false,
    defaultNode: () => ({ type: 'text', props: { text: 'Texto' } }),
    propFields: [
      { name: 'text', label: 'text', kind: 'expression', placeholder: 'Texto' },
      { name: 'muted', label: 'muted', kind: 'boolean' },
    ],
  },
  {
    type: 'button',
    label: 'Button',
    group: 'Conteúdo',
    icon: MousePointerClick,
    isContainer: false,
    defaultNode: () => ({ type: 'button', props: { label: 'Ação' } }),
    propFields: [
      { name: 'label', label: 'label', kind: 'expression', placeholder: 'Ação' },
      { name: 'disabled', label: 'disabled', kind: 'boolean' },
    ],
  },
  {
    type: 'image',
    label: 'Image',
    group: 'Conteúdo',
    icon: Image,
    isContainer: false,
    defaultNode: () => ({ type: 'image', props: { src: '', alt: '' } }),
    propFields: [
      { name: 'src', label: 'src', kind: 'string', placeholder: 'https://…' },
      { name: 'alt', label: 'alt', kind: 'expression' },
    ],
  },
  {
    type: 'chart',
    label: 'Chart',
    group: 'Dados',
    icon: BarChart3,
    isContainer: false,
    defaultNode: () => ({
      type: 'chart',
      props: { kind: 'line', x: 'x', y: 'y', height: 200, data: [] },
    }),
    propFields: [
      { name: 'kind', label: 'kind', kind: 'select', options: ['line', 'bar', 'area', 'pie'] },
      { name: 'x', label: 'x', kind: 'string' },
      { name: 'y', label: 'y', kind: 'string' },
      { name: 'height', label: 'height', kind: 'number' },
      { name: 'data', label: 'data', kind: 'json' },
    ],
  },
  // Vocabulário financeiro (K3)
  {
    type: 'card',
    label: 'Card',
    group: 'Layout',
    icon: CreditCard,
    isContainer: true,
    defaultNode: () => ({ type: 'card', children: [] }),
    propFields: [{ name: 'title', label: 'title', kind: 'expression' }],
  },
  {
    type: 'list',
    label: 'List',
    group: 'Layout',
    icon: List,
    isContainer: true,
    defaultNode: () => ({ type: 'list', children: [] }),
    propFields: [],
  },
  {
    type: 'badge',
    label: 'Badge',
    group: 'Conteúdo',
    icon: Tag,
    isContainer: false,
    defaultNode: () => ({ type: 'badge', props: { text: 'Novo', variant: 'default' } }),
    propFields: [
      { name: 'text', label: 'text', kind: 'expression', placeholder: 'Novo' },
      {
        name: 'variant',
        label: 'variant',
        kind: 'select',
        options: ['default', 'success', 'warning', 'destructive'],
      },
    ],
  },
  {
    type: 'divider',
    label: 'Divider',
    group: 'Conteúdo',
    icon: Minus,
    isContainer: false,
    defaultNode: () => ({ type: 'divider', props: {} }),
    propFields: [{ name: 'label', label: 'label', kind: 'expression' }],
  },
  {
    type: 'kpi',
    label: 'KPI',
    group: 'Dados',
    icon: TrendingUp,
    isContainer: false,
    defaultNode: () => ({ type: 'kpi', props: { label: 'Saldo', value: '0,00' } }),
    propFields: [
      { name: 'label', label: 'label', kind: 'expression', placeholder: 'Saldo' },
      { name: 'value', label: 'value', kind: 'expression', placeholder: '1.500,00' },
      { name: 'delta', label: 'delta', kind: 'expression', placeholder: '+2,4%' },
      { name: 'trend', label: 'trend', kind: 'select', options: ['up', 'down', 'flat'] },
    ],
  },
  {
    type: 'list-item',
    label: 'List item',
    group: 'Dados',
    icon: Rows2,
    isContainer: false,
    defaultNode: () => ({ type: 'list-item', props: { label: 'Item', value: '' } }),
    propFields: [
      { name: 'label', label: 'label', kind: 'expression', placeholder: 'Mercado' },
      { name: 'value', label: 'value', kind: 'expression', placeholder: '-R$ 182,90' },
      { name: 'muted', label: 'muted', kind: 'boolean' },
    ],
  },
];

const BY_TYPE = new Map(VOCABULARY.map((entry) => [entry.type, entry]));

export function vocabFor(type: string): VocabEntry | undefined {
  return BY_TYPE.get(type);
}

/** Tipos que aceitam filhos — recebem dropzones + placeholder de container vazio. */
export const CONTAINER_TYPES: ReadonlySet<string> = new Set(
  VOCABULARY.filter((entry) => entry.isContainer).map((entry) => entry.type),
);

/** Cria o nó default de um tipo (paleta → canvas); `undefined` se o tipo é desconhecido. */
export function emptyNode(type: string): TemplateNode | undefined {
  return BY_TYPE.get(type)?.defaultNode();
}

export const VOCAB_GROUPS: readonly VocabGroup[] = ['Layout', 'Conteúdo', 'Dados'];
