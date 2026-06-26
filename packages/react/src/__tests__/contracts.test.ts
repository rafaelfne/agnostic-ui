import { ComponentContractSchema } from '@yukilabs/agnostic-ui-core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { createComponentContracts, validateNodeProps } from '../contracts';
import type { ComponentRegistry } from '../registry';
import { SduiRenderer } from '../renderer';

const textContract = ComponentContractSchema.parse({
  ref: { namespace: 'core', name: 'text', version: 1 },
  props: { type: 'object', required: ['value'], properties: { value: { type: 'string' } } },
  renderOnly: true,
});

describe('G6 — component contract + validação de props', () => {
  it('createComponentContracts indexa por tipo; validateNodeProps valida', () => {
    const contracts = createComponentContracts([textContract]);
    expect(contracts.text).toBeDefined();
    expect(validateNodeProps(contracts, 'text', { value: 'hi' })).toEqual([]);
    expect(validateNodeProps(contracts, 'text', {})).toEqual(['missing required prop: value']);
    expect(validateNodeProps(contracts, 'text', { value: 42 })).toEqual([
      'prop value: expected string',
    ]);
    expect(validateNodeProps(contracts, 'unknown', {})).toEqual([]);
  });

  it('o renderer avisa (não-fatal) ao violar o contrato; sem contracts nada muda', () => {
    const contracts = createComponentContracts([textContract]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderToStaticMarkup(SduiRenderer({ node: { type: 'text', props: {} } }));
    expect(warn).not.toHaveBeenCalled();

    const html = renderToStaticMarkup(
      SduiRenderer({ node: { type: 'text', props: {} }, contracts }),
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing required prop: value'));
    expect(typeof html).toBe('string');

    warn.mockRestore();
  });

  it('render-only: o componente recebe só node/props/children (sem runner/dispatcher)', () => {
    let receivedKeys: string[] = [];
    const registry: ComponentRegistry = {
      probe: (componentProps) => {
        receivedKeys = Object.keys(componentProps).sort();
        return null;
      },
    };
    renderToStaticMarkup(SduiRenderer({ node: { type: 'probe' }, registry }));
    expect(receivedKeys).toEqual(['children', 'node', 'props']);
  });
});
