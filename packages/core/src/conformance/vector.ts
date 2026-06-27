import { z } from 'zod';
import { TemplateNodeSchema } from '../schemas/template';

/** Versão da spec de conformance do corpus v1. Vetores declaram a versão que miram. */
export const CONFORMANCE_SPEC_VERSION = '1.0';

/** Campos comuns a todo vetor, qualquer `kind`. */
const baseFields = {
  name: z.string().min(1),
  description: z.string().optional(),
  specVersion: z.string().min(1),
};

/**
 * Vetor de **binding** (`kind: 'template'`): dado um `template` com `{{ ... }}` e um
 * `context`, o renderer produz a árvore `expected`. O corpus é renderer-agnóstico e
 * roda nos três renderers — engine (oráculo), React, Flutter (ADR 0005 §2 / 0006 §8).
 */
export const TemplateVectorSchema = z
  .object({
    kind: z.literal('template'),
    ...baseFields,
    /** Locale para pipes sensíveis a locale (ex. currency/date); ausente → default. */
    locale: z.string().optional(),
    template: TemplateNodeSchema,
    context: z.record(z.unknown()),
    expected: TemplateNodeSchema,
  })
  .strict();
export type TemplateConformanceVector = z.infer<typeof TemplateVectorSchema>;

/**
 * Vetor de **operador** (`kind: 'operator'`): um cenário runnable rodado pelo engine
 * (operadores só rodam no engine; não é cross-renderer). O `step` é executado num flow
 * com o `input` como escopo, comparando `output`/emissões/erro com `expect` (H5).
 */
export const OperatorVectorSchema = z
  .object({
    kind: z.literal('operator'),
    ...baseFields,
    /** Step a executar (um StepDef; validado ao parsear o flow). */
    step: z.record(z.unknown()),
    /** Escopo inicial (entra como `request`). */
    input: z.record(z.unknown()).optional(),
    /** Resposta mockada do integration runner (para `call-integration`). */
    integrationResult: z.unknown().optional(),
    /** Expressão de saída do flow a comparar com `expect.body`. */
    output: z.string().min(1),
    expect: z
      .object({
        body: z.unknown().optional(),
        emits: z.array(z.string()).optional(),
        errorKind: z.string().optional(),
      })
      .strict(),
  })
  .strict();
export type OperatorConformanceVector = z.infer<typeof OperatorVectorSchema>;

/**
 * Vetor de **componente** (`kind: 'component'`): dadas `props` + `context`, o
 * componente `component` resolve a subárvore `expected`. Runners em H5.
 */
export const ComponentVectorSchema = z
  .object({
    kind: z.literal('component'),
    ...baseFields,
    component: z.string().min(1),
    props: z.record(z.unknown()),
    context: z.record(z.unknown()),
    expected: TemplateNodeSchema,
  })
  .strict();
export type ComponentConformanceVector = z.infer<typeof ComponentVectorSchema>;

/**
 * Um vetor de conformance, discriminado por `kind` (H4): `template` (binding, já
 * coberto pelos 3 runners), `operator` e `component` (shapes prontos; runners em H5).
 * Cada opção é `.strict()` — chave desconhecida → erro (escape fechado em H2).
 */
export const ConformanceVectorSchema = z.discriminatedUnion('kind', [
  TemplateVectorSchema,
  OperatorVectorSchema,
  ComponentVectorSchema,
]);

export type ConformanceVector = z.infer<typeof ConformanceVectorSchema>;
