import {
  type FlowDefinitionInput,
  FlowDefinitionSchema,
  type StepDef,
} from '@yukilabs/agnostic-ui-engine';

/** The editable working value of a flow draft — what the editor mutates and saves. */
export type FlowDraft = FlowDefinitionInput;

export const STEP_OPS = [
  'validate',
  'call-integration',
  'compose-template',
  'branch',
  'emit-event',
  'foreach',
] as const;
export type StepOp = (typeof STEP_OPS)[number];

/** Ops whose shape is a tree/nested steps — edited as raw JSON until the Fase F builder. */
export const RAW_STEP_OPS: readonly StepOp[] = ['compose-template', 'branch', 'foreach'];

export interface ValidationIssue {
  path: string;
  message: string;
}
export type FlowValidation = { ok: true } | { ok: false; issues: ValidationIssue[] };

/** A minimal, schema-valid starting point for a new flow. */
export function emptyFlow(slug: string): FlowDraft {
  return {
    id: slug,
    name: slug,
    input: { from: 'executionContext', pick: ['customerId'] },
    steps: [{ op: 'validate', require: ['customerId'] }],
    output: '{{ customerId }}',
    emits: [],
  };
}

/** A schema-valid default for each op, used when adding a step. */
export function emptyStep(op: StepOp): StepDef {
  switch (op) {
    case 'validate':
      return { op: 'validate', require: [] };
    case 'call-integration':
      return { op: 'call-integration', integration: 'core', operation: 'getData', as: 'result' };
    case 'compose-template':
      return { op: 'compose-template', template: { type: 'text' }, as: 'view' };
    case 'branch':
      return { op: 'branch', cases: [{ when: '{{ true }}', steps: [] }] };
    case 'emit-event':
      return { op: 'emit-event', event: 'something-happened' };
    case 'foreach':
      return { op: 'foreach', items: '{{ items }}', as: 'results', steps: [] };
  }
}

/** Validates a draft against the engine schema, flattening Zod issues for display. */
export function validateFlow(value: unknown): FlowValidation {
  const result = FlowDefinitionSchema.safeParse(value);
  if (result.success) return { ok: true };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
      message: issue.message,
    })),
  };
}
