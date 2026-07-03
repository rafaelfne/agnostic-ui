import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import { type ReactElement, useState } from 'react';
import { ChevronRight, Code2, Trash2 } from 'lucide-react';

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
import { cn } from '@/lib/utils';

import { getNodeAt, parsePath } from './nodePath';
import { type PropField, vocabFor } from './screenVocabulary';

const EXPR = /^\s*\{\{[\s\S]*\}\}\s*$/;
const isExpr = (value: unknown): value is string => typeof value === 'string' && EXPR.test(value);

interface InspectorProps {
  root: TemplateNode;
  /** Path serializado do nó selecionado (`''` = raiz, `null` = nada selecionado). */
  path: string | null;
  onPatchProps: (path: string, props: Record<string, unknown>) => void;
  onPatchNode: (path: string, patch: Partial<TemplateNode>) => void;
  onSelect: (path: string | null) => void;
  onRemove: (path: string) => void;
}

/** Editor de JSON cru (kind `json`, ex.: `chart.data`) com hook no topo. */
function JsonField({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (next: unknown) => void;
}): ReactElement {
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setError(null);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'invalid JSON');
          }
        }}
        rows={5}
        spellCheck={false}
        className="font-mono text-[11px]"
      />
      {error !== null && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </>
  );
}

/** Um campo tipado por prop (o análogo do StepEditor por op). */
function PropInput({
  field,
  value,
  onChange,
}: {
  field: PropField;
  value: unknown;
  onChange: (next: unknown) => void;
}): ReactElement {
  if (field.kind === 'boolean') {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 rounded border-zinc-300 accent-[var(--tenant-accent,#6D28D9)]"
        />
        {field.label}
      </label>
    );
  }
  if (field.kind === 'select') {
    return (
      <Select value={value === undefined ? '' : String(value)} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={String(option)} value={String(option)} className="text-xs">
              {String(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (field.kind === 'number') {
    return (
      <Input
        type="number"
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="h-8 text-xs tabular-nums"
      />
    );
  }
  if (field.kind === 'json') {
    return <JsonField value={value} onChange={onChange} />;
  }
  // string | expression
  const expr = field.kind === 'expression' && isExpr(value);
  return (
    <div className="relative">
      <Input
        value={typeof value === 'string' ? value : value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={cn(
          'h-8 text-xs',
          expr && 'border-violet-300 bg-violet-50/50 pr-16 font-mono text-violet-900',
        )}
      />
      {field.kind === 'expression' && (
        <button
          type="button"
          title={expr ? 'valor literal' : 'usar expressão {{ }}'}
          onClick={() => {
            const raw = typeof value === 'string' ? value : '';
            onChange(expr ? raw.replace(/^\s*\{\{\s*|\s*\}\}\s*$/g, '') : `{{ ${raw} }}`);
          }}
          className={cn(
            'absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            expr ? 'bg-violet-100 text-violet-700' : 'text-zinc-400 hover:text-zinc-600',
          )}
        >
          <Code2 className="size-3" />
          {expr && 'expressão'}
        </button>
      )}
    </div>
  );
}

/** Inspetor do nó selecionado: breadcrumb, props tipadas, seção Avançado e remover. */
export function NodeInspector({
  root,
  path,
  onPatchProps,
  onPatchNode,
  onSelect,
  onRemove,
}: InspectorProps): ReactElement {
  const [advanced, setAdvanced] = useState(false);
  const node = path === null ? undefined : getNodeAt(root, parsePath(path));

  if (path === null || node === undefined) {
    return (
      <div className="grid h-full place-items-center border-l p-6 text-center text-sm text-muted-foreground">
        Selecione um nó no canvas para editar.
      </div>
    );
  }

  const entry = vocabFor(node.type);
  const props = node.props ?? {};
  const segments = parsePath(path);
  const crumbs = [{ type: root.type, p: '' }];
  let cursor: TemplateNode | undefined = root;
  segments.forEach((idx, i) => {
    cursor = getNodeAt(root, segments.slice(0, i + 1));
    if (cursor !== undefined)
      crumbs.push({ type: cursor.type, p: segments.slice(0, i + 1).join('.') });
  });
  const setProp = (name: string, value: unknown): void =>
    onPatchProps(path, value === undefined ? omit(props, name) : { ...props, [name]: value });

  return (
    <div className="flex h-full flex-col overflow-y-auto border-l">
      <div className="border-b p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
            {entry ? <entry.icon className="size-4" /> : <Code2 className="size-4" />}
          </span>
          <span className="text-sm font-semibold">{node.type}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-0.5 text-[11px] text-muted-foreground">
          {crumbs.map((crumb, i) => (
            <span key={crumb.p} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight className="size-3" />}
              <button
                type="button"
                onClick={() => onSelect(crumb.p)}
                className={cn(
                  'rounded px-1 hover:text-zinc-800',
                  crumb.p === path && 'font-medium text-violet-700',
                )}
              >
                {crumb.type}
              </button>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {entry && entry.propFields.length > 0 ? (
          entry.propFields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1">
              {field.kind !== 'boolean' && (
                <Label className="text-[11px] font-medium text-zinc-600">{field.label}</Label>
              )}
              <PropInput
                field={field}
                value={props[field.name]}
                onChange={(next) => setProp(field.name, next)}
              />
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">Este tipo não tem propriedades editáveis.</p>
        )}
      </div>

      <div className="mx-3 mb-3 rounded-xl border">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="flex w-full items-center justify-between rounded-t-xl bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600"
        >
          Avançado
          <ChevronRight className={cn('size-3.5 transition-transform', advanced && 'rotate-90')} />
        </button>
        {advanced && (
          <div className="flex flex-col gap-3 p-3">
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] font-medium text-zinc-600">id</Label>
              <Input
                value={node.id ?? ''}
                onChange={(e) => onPatchNode(path, { id: e.target.value || undefined })}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] font-medium text-zinc-600">dataBind</Label>
              <Input
                value={node.dataBind ?? ''}
                onChange={(e) => onPatchNode(path, { dataBind: e.target.value || undefined })}
                placeholder="{{ items }}"
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {path !== '' && (
        <div className="mt-auto border-t p-3">
          <Button
            variant="outline"
            onClick={() => onRemove(path)}
            className="w-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-700"
          >
            <Trash2 className="size-4" /> Remover nó
          </Button>
        </div>
      )}
    </div>
  );
}

function omit(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const { [key]: _drop, ...rest } = obj;
  return rest;
}
