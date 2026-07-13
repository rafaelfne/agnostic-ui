import type { FlowDraft } from './flowModel';

/**
 * Resumo LEGÍVEL de um flow — a config-como-frase (protótipo da direção "builder amigável").
 * Lê a `FlowDefinition` (a mesma que o editor salva) e devolve cláusulas SEMÂNTICAS, sem
 * jargão de engine: "quando alguém abre X, busca Y de Z, e mostra W". A camada de idioma
 * (conectivos pt/en) e os chips editáveis vivem no `FlowSummaryPanel` — este módulo é puro
 * e neutro de idioma, então é testável e reusável.
 *
 * É tolerante a rascunho inválido (o editor muta antes de validar): lê os campos de forma
 * defensiva e degrada para `advanced` quando um passo não cabe numa frase.
 */

/** Um chip editável na frase — mapeia de volta a um campo da config. */
export type ClauseEdit = { kind: 'trigger-path' } | { kind: 'integration'; stepIndex: number };

export interface Clause {
  /** A semântica da cláusula — o painel escolhe os conectivos e ícones a partir daqui. */
  role: 'trigger' | 'validate' | 'fetch' | 'compose' | 'emit' | 'advanced' | 'output';
  /** Valor legível principal (path, nome da integração, campos, evento, saída). */
  value: string;
  /** Valor secundário (ex.: o `as` do fetch — "o que se obtém"). */
  detail?: string;
  /** Presente → o valor vira um chip editável e diz onde escrever de volta. */
  edit?: ClauseEdit;
}

export interface FlowSummary {
  clauses: Clause[];
  /** Eventos do flow (`draft.emits`) — renderizados numa linha "além disso, registra…". */
  emits: string[];
  /** Algum passo caiu em `advanced` (branch/foreach/desconhecido) → dica do modo dev. */
  hasAdvanced: boolean;
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

/** `{{ invest }}` → `invest`; string literal → ela mesma; objeto/vazio → `''`. */
function readableOutput(output: unknown): string {
  const str = asString(output);
  if (str === undefined) return '';
  const match = str.match(/^\s*\{\{\s*([\s\S]*?)\s*\}\}\s*$/);
  return match?.[1] ?? str;
}

function summarizeStep(step: unknown, index: number): Clause | null {
  if (step === null || typeof step !== 'object') return null;
  const s = step as Record<string, unknown>;
  switch (s.op) {
    case 'validate': {
      const require = Array.isArray(s.require)
        ? s.require.filter((x): x is string => typeof x === 'string')
        : [];
      return { role: 'validate', value: require.join(', ') };
    }
    case 'call-integration':
      return {
        role: 'fetch',
        value: asString(s.integration) ?? '?',
        detail: asString(s.as),
        edit: { kind: 'integration', stepIndex: index },
      };
    case 'compose-template':
      return { role: 'compose', value: asString(s.as) ?? '' };
    case 'emit-event':
      return { role: 'emit', value: asString(s.event) ?? '' };
    case 'branch':
    case 'foreach':
      return { role: 'advanced', value: String(s.op) };
    default:
      return { role: 'advanced', value: asString(s.op) ?? '?' };
  }
}

export function summarizeFlow(draft: FlowDraft): FlowSummary {
  const clauses: Clause[] = [];

  const trigger = draft.trigger as { kind?: unknown; path?: unknown } | undefined;
  if (trigger?.kind === 'http') {
    clauses.push({
      role: 'trigger',
      value: asString(trigger.path) ?? '/',
      edit: { kind: 'trigger-path' },
    });
  } else {
    clauses.push({ role: 'trigger', value: '' });
  }

  const steps = Array.isArray(draft.steps) ? draft.steps : [];
  steps.forEach((step, index) => {
    const clause = summarizeStep(step, index);
    if (clause !== null) clauses.push(clause);
  });

  clauses.push({ role: 'output', value: readableOutput(draft.output) });

  const emits = Array.isArray(draft.emits)
    ? draft.emits.filter((x): x is string => typeof x === 'string')
    : [];

  return { clauses, emits, hasAdvanced: clauses.some((c) => c.role === 'advanced') };
}
