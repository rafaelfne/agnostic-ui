import type { z } from 'zod';

import { type OperatorContract, OperatorContractSchema, coreContractRef } from './contract';

function define(input: z.input<typeof OperatorContractSchema>): OperatorContract {
  return OperatorContractSchema.parse(input);
}

/**
 * Os 6 operadores core expressos como contratos `core.*@1` com I/O real (G2). As
 * capabilities/efeitos descrevem o TIPO de operador; integrações, eventos e segredos
 * específicos vêm da config do step (o grant per-step é enforçado em G4).
 */
export const coreOperatorContracts = {
  validate: define({
    ref: coreContractRef('validate'),
    input: { type: 'object', description: 'escopo lido pela validação' },
    output: { type: 'object', description: 'bag opcional sob `as`' },
    capabilities: { pure: true },
    effects: { reads: ['scope'], reversible: true, idempotent: true },
  }),
  'call-integration': define({
    ref: coreContractRef('call-integration'),
    input: { type: 'object', description: 'input da operação de integração' },
    output: { type: 'object', description: 'resultado da integração sob `as`' },
    capabilities: { pure: false },
    effects: { writes: ['as'], reversible: true, idempotent: true },
  }),
  'compose-template': define({
    ref: coreContractRef('compose-template'),
    input: { type: 'object', description: 'dados a ligar no template' },
    output: { type: 'object', description: 'TemplateNode resolvido sob `as`' },
    capabilities: { pure: true },
    effects: { writes: ['as'], reversible: true, idempotent: true },
  }),
  branch: define({
    ref: coreContractRef('branch'),
    input: { type: 'object', description: 'escopo avaliado nas condições' },
    output: { type: 'object', description: 'sem saída própria; delega aos sub-steps' },
    capabilities: { pure: true },
    effects: { reversible: true, idempotent: true },
  }),
  'emit-event': define({
    ref: coreContractRef('emit-event'),
    input: { type: 'object', description: 'payload do evento' },
    output: { type: 'object', description: 'sem saída no escopo' },
    capabilities: { pure: false },
    effects: { reversible: true, idempotent: false },
  }),
  foreach: define({
    ref: coreContractRef('foreach'),
    input: { type: 'object', description: 'escopo com o array de itens' },
    output: { type: 'object', description: 'array de bags por item sob `as`' },
    capabilities: { pure: true },
    effects: { writes: ['as'], reversible: true, idempotent: true },
  }),
} satisfies Record<string, OperatorContract>;
