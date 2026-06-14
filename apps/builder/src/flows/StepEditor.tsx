import type { StepDef } from '@yukilabs/agnostic-ui-engine';
import { type ReactElement, useState } from 'react';

import { StringListInput } from '../components/StringListInput';

import { RAW_STEP_OPS, STEP_OPS, type StepOp, emptyStep } from './flowModel';

/** Renders an expression (string template, or an AST node as JSON) as editable text. */
function exprText(value: unknown): string {
  if (value === undefined) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** Sets `key` to `value`, or removes it when the text is blank (an unset optional). */
function setOptional<T extends object>(obj: T, key: string, value: string): T {
  const next = { ...obj } as Record<string, unknown>;
  if (value.trim() === '') delete next[key];
  else next[key] = value;
  return next as T;
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

/** Raw JSON editor for tree/nested ops (compose-template, branch) — Fase F gets a visual builder. */
function RawStepBody({
  step,
  onChange,
}: {
  step: StepDef;
  onChange: (next: StepDef) => void;
}): ReactElement {
  const [text, setText] = useState(() => JSON.stringify(step, null, 2));
  const [error, setError] = useState<string | null>(null);
  return (
    <label>
      JSON do step
      <textarea
        rows={8}
        value={text}
        onChange={(event) => {
          const raw = event.target.value;
          setText(raw);
          try {
            onChange(JSON.parse(raw) as StepDef);
            setError(null);
          } catch {
            setError('JSON inválido');
          }
        }}
      />
      {error !== null && <span role="alert">{error}</span>}
    </label>
  );
}

export interface StepEditorProps {
  step: StepDef;
  index: number;
  onChange: (next: StepDef) => void;
  onRemove: () => void;
}

export function StepEditor({ step, index, onChange, onRemove }: StepEditorProps): ReactElement {
  return (
    <fieldset>
      <legend>
        #{index + 1} — {step.op}
      </legend>
      <label>
        op
        <select
          value={step.op}
          onChange={(event) => onChange(emptyStep(event.target.value as StepOp))}
        >
          {STEP_OPS.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      </label>

      {RAW_STEP_OPS.includes(step.op) ? (
        <RawStepBody key={step.op} step={step} onChange={onChange} />
      ) : step.op === 'validate' ? (
        <>
          <StringListInput
            label="require"
            value={step.require}
            onChange={(require) => onChange({ ...step, require })}
          />
          <TextField
            label="schema (opcional)"
            value={step.schema ?? ''}
            onChange={(value) => onChange(setOptional(step, 'schema', value))}
          />
          <TextField
            label="as (opcional)"
            value={step.as ?? ''}
            onChange={(value) => onChange(setOptional(step, 'as', value))}
          />
          <TextField
            label="when (expr, opcional)"
            value={exprText(step.when)}
            onChange={(value) => onChange(setOptional(step, 'when', value))}
          />
        </>
      ) : step.op === 'call-integration' ? (
        <>
          <TextField
            label="integration"
            value={step.integration}
            onChange={(value) => onChange({ ...step, integration: value })}
          />
          <TextField
            label="operation"
            value={step.operation}
            onChange={(value) => onChange({ ...step, operation: value })}
          />
          <TextField
            label="as"
            value={step.as}
            onChange={(value) => onChange({ ...step, as: value })}
          />
          <TextField
            label="input (expr, opcional)"
            value={exprText(step.input)}
            onChange={(value) => onChange(setOptional(step, 'input', value))}
          />
          <TextField
            label="when (expr, opcional)"
            value={exprText(step.when)}
            onChange={(value) => onChange(setOptional(step, 'when', value))}
          />
        </>
      ) : step.op === 'emit-event' ? (
        <>
          <TextField
            label="event"
            value={step.event}
            onChange={(value) => onChange({ ...step, event: value })}
          />
          <TextField
            label="payload (expr, opcional)"
            value={exprText(step.payload)}
            onChange={(value) => onChange(setOptional(step, 'payload', value))}
          />
          <TextField
            label="when (expr, opcional)"
            value={exprText(step.when)}
            onChange={(value) => onChange(setOptional(step, 'when', value))}
          />
        </>
      ) : null}

      <button type="button" onClick={onRemove}>
        Remover step
      </button>
    </fieldset>
  );
}
