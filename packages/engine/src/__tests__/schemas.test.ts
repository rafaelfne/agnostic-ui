import { describe, expect, it } from 'vitest';

import {
  FlowDefinitionSchema,
  HookDefSchema,
  IdSchema,
  IntegrationDefinitionSchema,
  ScreenDefSchema,
  StepDefSchema,
  SubscriptionDefSchema,
  TriggerDefSchema,
} from '../schemas';

describe('IdSchema', () => {
  it('accepts kebab, camel and plain identifiers', () => {
    for (const id of ['get-balance', 'getBalance', 'core', 'invest']) {
      expect(IdSchema.safeParse(id).success).toBe(true);
    }
  });

  it('rejects empty and non-identifier ids', () => {
    for (const id of ['', '1abc', 'has space', 'no/slash']) {
      expect(IdSchema.safeParse(id).success).toBe(false);
    }
  });
});

describe('TriggerDefSchema', () => {
  it('parses an http trigger and rejects unknown kinds', () => {
    expect(
      TriggerDefSchema.safeParse({ kind: 'http', method: 'GET', path: '/api/balance' }).success,
    ).toBe(true);
    expect(TriggerDefSchema.safeParse({ kind: 'webhook' }).success).toBe(false);
  });
});

describe('StepDefSchema', () => {
  it('parses each Fase A operator', () => {
    expect(StepDefSchema.safeParse({ op: 'validate', require: ['customerId'] }).success).toBe(true);
    expect(
      StepDefSchema.safeParse({
        op: 'call-integration',
        integration: 'core',
        operation: 'getBalance',
        as: 'balance',
      }).success,
    ).toBe(true);
    expect(
      StepDefSchema.safeParse({
        op: 'compose-template',
        as: 'screen',
        template: { type: 'screen' },
      }).success,
    ).toBe(true);
    expect(StepDefSchema.safeParse({ op: 'emit-event', event: 'balance-read' }).success).toBe(true);
  });

  it('requires `as` on call-integration', () => {
    expect(
      StepDefSchema.safeParse({
        op: 'call-integration',
        integration: 'core',
        operation: 'getBalance',
      }).success,
    ).toBe(false);
  });

  it('parses a recursive branch with nested steps', () => {
    const result = StepDefSchema.safeParse({
      op: 'branch',
      cases: [
        {
          when: { kind: 'path', path: 'isPremium' },
          steps: [
            { op: 'call-integration', integration: 'core', operation: 'getPremium', as: 'data' },
          ],
        },
      ],
      else: [{ op: 'emit-event', event: 'fallback' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown operator', () => {
    expect(StepDefSchema.safeParse({ op: 'exec', cmd: 'rm -rf /' }).success).toBe(false);
  });
});

describe('FlowDefinitionSchema', () => {
  it('parses a flow and applies input defaults', () => {
    const parsed = FlowDefinitionSchema.parse({
      id: 'get-balance',
      name: 'Get Balance',
      steps: [{ op: 'validate', require: ['customerId'] }],
      output: '{{ balance }}',
    });
    expect(parsed.input).toEqual({ from: 'executionContext', pick: [] });
    expect(parsed.emits).toEqual([]);
  });

  it('rejects a flow with no steps', () => {
    expect(
      FlowDefinitionSchema.safeParse({ id: 'x', name: 'X', steps: [], output: '{{ x }}' }).success,
    ).toBe(false);
  });
});

describe('other primitives', () => {
  it('parses a mock IntegrationDefinition', () => {
    expect(
      IntegrationDefinitionSchema.safeParse({
        id: 'core',
        name: 'Core',
        kind: 'mock',
        operations: [{ id: 'getBalance' }],
      }).success,
    ).toBe(true);
  });

  it('parses a ScreenDef bound to a flow', () => {
    expect(
      ScreenDefSchema.safeParse({
        id: 'invest',
        route: '/invest',
        root: { type: 'screen', children: [{ type: 'header' }] },
        dataFlow: 'invest-screen',
      }).success,
    ).toBe(true);
  });

  it('parses HookDef and SubscriptionDef', () => {
    expect(
      HookDefSchema.safeParse({ phase: 'before', scope: 'global', action: { builtin: 'auth' } })
        .success,
    ).toBe(true);
    expect(SubscriptionDefSchema.safeParse({ event: 'balance-read', flow: 'notify' }).success).toBe(
      true,
    );
  });
});
