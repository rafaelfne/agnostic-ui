import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FlowScreen } from '../FlowScreen';
import { createMockRunner } from '../mockRunner';

const flow: FlowDefinitionInput = {
  id: 'invest-screen',
  name: 'Invest Screen',
  input: { from: 'executionContext', pick: ['customerId'] },
  steps: [
    { op: 'call-integration', integration: 'core', operation: 'getInvestFlow', as: 'flow' },
    {
      op: 'compose-template',
      as: 'screen',
      template: { type: 'screen', children: [{ type: 'heading', props: { title: 'Investir' } }] },
    },
  ],
  output: '{{ screen }}',
};

const auth: ExecutionContext = {
  mode: 'sandbox',
  tenantId: 'partnerco',
  customerId: 'cus_1',
  mockProfile: 'happyPath',
};

const deps = {
  integrationRunner: createMockRunner({ core: { getInvestFlow: { happyPath: () => ({}) } } }),
};

describe('FlowScreen', () => {
  // renderToStaticMarkup does not run effects, so the flow stays loading — this
  // asserts the loading branch. The success path is covered by the engine parity
  // tests + createMockRunner + SduiRenderer unit tests.
  it('shows the loading fallback before the flow resolves', () => {
    const html = renderToStaticMarkup(
      <FlowScreen flow={flow} input={{ auth }} deps={deps} loading={<p>carregando…</p>} />,
    );
    expect(html).toBe('<p>carregando…</p>');
  });
});
