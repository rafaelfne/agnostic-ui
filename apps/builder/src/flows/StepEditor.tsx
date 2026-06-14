import type { StepDef } from '@yukilabs/agnostic-ui-engine';
import { type ReactElement, useState } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';

import { StringListInput } from '@/components/StringListInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n/i18n';

import { RAW_STEP_OPS, STEP_OPS, type StepOp, emptyStep } from './flowModel';

function exprText(value: unknown): string {
  if (value === undefined) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}
function setOptional<T extends object>(obj: T, key: string, value: string): T {
  const next = { ...obj } as Record<string, unknown>;
  if (value.trim() === '') delete next[key];
  else next[key] = value;
  return next as T;
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {hint && <span className="font-normal">{hint}</span>}
      </Label>
      <Input
        className="font-mono"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Raw JSON editor for tree/nested ops (compose-template, branch) — Phase F gets a visual builder. */
function RawStepBody({
  step,
  onChange,
  badge,
}: {
  step: StepDef;
  onChange: (next: StepDef) => void;
  badge: string;
}): ReactElement {
  const [text, setText] = useState(() => JSON.stringify(step, null, 2));
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">
        JSON{' '}
        <Badge variant="secondary" className="font-normal">
          {badge}
        </Badge>
      </Label>
      <Textarea
        rows={8}
        className="bg-muted/40 font-mono text-[12.5px] leading-relaxed"
        value={text}
        onChange={(event) => {
          const raw = event.target.value;
          setText(raw);
          try {
            onChange(JSON.parse(raw) as StepDef);
            setError(null);
          } catch {
            setError('Invalid JSON');
          }
        }}
      />
      {error !== null && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}

export interface StepEditorProps {
  step: StepDef;
  index: number;
  onChange: (next: StepDef) => void;
}

/** The sub-form for the currently-selected step. `op` switches the shape via emptyStep(). */
export function StepEditor({ step, index, onChange }: StepEditorProps): ReactElement {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="grid size-[34px] place-items-center rounded-lg bg-primary/10 text-primary">
          <GripVertical className="size-4" />
        </span>
        <div className="flex-1">
          <div className="font-mono text-[11px] text-muted-foreground">
            {t('editor.step')} {String(index + 1).padStart(2, '0')}
          </div>
          <div className="text-base font-semibold tracking-tight">
            {t(`op.${step.op}` as 'op.validate')}
          </div>
        </div>
        <div className="flex w-44 flex-col gap-1.5">
          <Label className="text-[11px] text-muted-foreground">op</Label>
          <Select value={step.op} onValueChange={(v) => onChange(emptyStep(v as StepOp))}>
            <SelectTrigger size="sm" className="font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STEP_OPS.map((op) => (
                <SelectItem key={op} value={op} className="font-mono">
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {RAW_STEP_OPS.includes(step.op) ? (
        <RawStepBody
          key={step.op}
          step={step}
          onChange={onChange}
          badge={step.op === 'branch' ? t('editor.phaseFBranch') : t('editor.phaseF')}
        />
      ) : step.op === 'validate' ? (
        <div className="grid grid-cols-2 gap-3.5">
          <div className="col-span-2">
            <StringListInput
              label="require"
              hint={` ${t('hint.required')}`}
              value={step.require}
              placeholder="customerId"
              onChange={(require) => onChange({ ...step, require })}
            />
          </div>
          <Field
            label="schema"
            hint={` ${t('hint.optional')}`}
            value={step.schema ?? ''}
            placeholder="BalanceInput"
            onChange={(v) => onChange(setOptional(step, 'schema', v))}
          />
          <Field
            label="as"
            hint={` ${t('hint.optional')}`}
            value={step.as ?? ''}
            onChange={(v) => onChange(setOptional(step, 'as', v))}
          />
          <div className="col-span-2">
            <Field
              label="when"
              hint={` ${t('hint.expressionOptional')}`}
              value={exprText(step.when)}
              onChange={(v) => onChange(setOptional(step, 'when', v))}
            />
          </div>
        </div>
      ) : step.op === 'call-integration' ? (
        <div className="grid grid-cols-2 gap-3.5">
          <Field
            label="integration"
            value={step.integration}
            onChange={(v) => onChange({ ...step, integration: v })}
          />
          <Field
            label="operation"
            value={step.operation}
            onChange={(v) => onChange({ ...step, operation: v })}
          />
          <Field
            label="as"
            hint={` ${t('hint.outputBinding')}`}
            value={step.as}
            onChange={(v) => onChange({ ...step, as: v })}
          />
          <Field
            label="input"
            hint={` ${t('hint.exprOptional')}`}
            value={exprText(step.input)}
            onChange={(v) => onChange(setOptional(step, 'input', v))}
          />
          <div className="col-span-2">
            <Field
              label="when"
              hint={` ${t('hint.exprOptional')}`}
              value={exprText(step.when)}
              onChange={(v) => onChange(setOptional(step, 'when', v))}
            />
          </div>
        </div>
      ) : step.op === 'emit-event' ? (
        <div className="grid grid-cols-2 gap-3.5">
          <div className="col-span-2">
            <Field
              label="event"
              value={step.event}
              onChange={(v) => onChange({ ...step, event: v })}
            />
          </div>
          <Field
            label="payload"
            hint={` ${t('hint.exprOptional')}`}
            value={exprText(step.payload)}
            onChange={(v) => onChange(setOptional(step, 'payload', v))}
          />
          <Field
            label="when"
            hint={` ${t('hint.exprOptional')}`}
            value={exprText(step.when)}
            onChange={(v) => onChange(setOptional(step, 'when', v))}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Compact card for the step pipeline (left column). */
export function StepPipelineItem({
  step,
  index,
  selected,
  hasIssue,
  onSelect,
  onRemove,
  dragProps,
}: {
  step: StepDef;
  index: number;
  selected: boolean;
  hasIssue: boolean;
  onSelect: () => void;
  onRemove: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement> & { draggable: boolean };
}): ReactElement {
  const { t } = useI18n();
  return (
    <div
      {...dragProps}
      onClick={onSelect}
      className={
        'cursor-pointer rounded-xl border bg-card transition-colors ' +
        (selected
          ? 'border-primary ring-[3px] ring-primary/15'
          : 'hover:border-muted-foreground/30')
      }
    >
      <div className="flex items-center gap-2.5 p-2.5">
        <GripVertical className="size-[15px] shrink-0 cursor-grab text-muted-foreground" />
        <span className="shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
            {t(`op.${step.op}` as 'op.validate')}
            {hasIssue && (
              <span
                className="size-1.5 shrink-0 rounded-full bg-destructive"
                title={t('editor.validation')}
              />
            )}
          </div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">
            {summarize(step, t)}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6.5 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={t('editor.remove')}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function summarize(step: StepDef, t: (k: 'sum.noRequire' | 'sum.cases') => string): string {
  switch (step.op) {
    case 'validate':
      return step.require?.length ? `require: ${step.require.join(', ')}` : t('sum.noRequire');
    case 'call-integration':
      return `${step.integration}.${step.operation} → ${step.as}`;
    case 'compose-template':
      return `→ ${step.as}`;
    case 'branch':
      return `${step.cases?.length ?? 0} ${t('sum.cases')}`;
    case 'emit-event':
      return step.event;
    default:
      return '';
  }
}
