import type { StepDef } from '@yukilabs/agnostic-ui-engine';
import { type ReactElement, type ReactNode, Fragment } from 'react';
import { Sparkles } from 'lucide-react';

import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n/i18n';

import type { FlowDraft } from './flowModel';
import { type Clause, summarizeFlow } from './flowSummary';

interface FlowSummaryPanelProps {
  draft: FlowDraft;
  /** Integrações disponíveis (slugs) para o chip de fonte de dados. */
  integrations: string[];
  /** O mesmo `update` do editor — escreve de volta no draft, passando pelo mesmo portão. */
  onChange: (changes: Partial<FlowDraft>) => void;
}

/** Token não-editável — uma palavra "dado" da frase. */
function Word({ children }: { children: ReactNode }): ReactElement {
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">
      {children}
    </span>
  );
}

/**
 * A config-como-frase (protótipo "builder amigável"). Lê o flow via `summarizeFlow` e o
 * mostra como uma frase em português/inglês; os dois pontos de maior valor — o caminho do
 * gatilho e a fonte de dados — são chips editáveis (input inline / catálogo), sem expor
 * expressão nenhuma. O resto vive no Modo desenvolvedor.
 */
export function FlowSummaryPanel({
  draft,
  integrations,
  onChange,
}: FlowSummaryPanelProps): ReactElement {
  const { t } = useI18n();
  const { clauses, emits, hasAdvanced } = summarizeFlow(draft);

  const setTriggerPath = (path: string): void => {
    const trigger = draft.trigger;
    if (trigger?.kind === 'http') onChange({ trigger: { ...trigger, path } });
  };
  const setIntegration = (stepIndex: number, integration: string): void => {
    const steps = Array.isArray(draft.steps) ? draft.steps : [];
    onChange({
      steps: steps.map((s, i) =>
        i === stepIndex ? ({ ...(s as StepDef), integration } as StepDef) : s,
      ),
    });
  };

  /** Chip editável: o caminho do gatilho (input inline auto-dimensionado). */
  const PathChip = ({ value }: { value: string }): ReactElement => (
    <input
      aria-label={t('flow.summary.editPath')}
      value={value}
      onChange={(e) => setTriggerPath(e.target.value)}
      style={{ width: `${Math.max(6, value.length + 1)}ch` }}
      className="rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-mono font-medium text-foreground outline-none transition-colors hover:border-primary focus:border-primary"
    />
  );

  /** Chip editável: a fonte de dados (catálogo de integrações + o valor atual). */
  const SourceChip = ({ value, stepIndex }: { value: string; stepIndex: number }): ReactElement => {
    const options = [...new Set([value, ...integrations])].filter((v) => v.length > 0);
    return (
      <Select value={value} onValueChange={(v) => setIntegration(stepIndex, v)}>
        <SelectTrigger
          aria-label={t('flow.summary.editSource')}
          className="inline-flex h-auto w-auto gap-1 rounded-md border-primary/30 bg-primary/5 px-1.5 py-0.5 font-medium text-foreground hover:border-primary focus:border-primary"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt} className="font-mono text-xs">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  /** Renderiza uma cláusula: conectivo (idioma) + valor (chip). */
  function renderClause(clause: Clause, key: number): ReactNode {
    switch (clause.role) {
      case 'trigger':
        return clause.value === '' ? (
          <Fragment key={key}>{t('flow.summary.whenRuns')}</Fragment>
        ) : (
          <Fragment key={key}>
            {t('flow.summary.whenOpen')} <PathChip value={clause.value} />
          </Fragment>
        );
      case 'validate':
        if (clause.value === '') return null;
        return (
          <Fragment key={key}>
            {', '}
            {t('flow.summary.check')} <Word>{clause.value}</Word>
          </Fragment>
        );
      case 'fetch': {
        const stepIndex = clause.edit?.kind === 'integration' ? clause.edit.stepIndex : 0;
        return (
          <Fragment key={key}>
            {', '}
            {t('flow.summary.fetch')} {clause.detail && <Word>{clause.detail}</Word>}{' '}
            {t('flow.summary.from')} <SourceChip value={clause.value} stepIndex={stepIndex} />
          </Fragment>
        );
      }
      case 'compose':
        return (
          <Fragment key={key}>
            {', '}
            {t('flow.summary.compose')}
          </Fragment>
        );
      case 'emit':
        return (
          <Fragment key={key}>
            {', '}
            {t('flow.summary.emit')} <Word>{clause.value}</Word>
          </Fragment>
        );
      case 'advanced':
        return (
          <Fragment key={key}>
            {', '}
            {t('flow.summary.advanced')}
          </Fragment>
        );
      case 'output':
        return (
          <Fragment key={key}>
            {' '}
            {t('flow.summary.show')}{' '}
            {clause.value === '' ? t('flow.summary.showData') : <Word>{clause.value}</Word>}
            {'.'}
          </Fragment>
        );
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3.5 flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">{t('flow.summary.title')}</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {t('flow.summary.editableHint')}
        </span>
      </div>

      <p className="text-lg leading-loose text-muted-foreground">
        {clauses.map((clause, i) => renderClause(clause, i))}
      </p>

      {emits.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <span>{t('flow.summary.also')}</span>
          {emits.map((event) => (
            <Word key={event}>{event}</Word>
          ))}
        </p>
      )}

      {hasAdvanced && (
        <p className="mt-3 text-xs text-muted-foreground">{t('flow.summary.devHint')}</p>
      )}
    </Card>
  );
}
