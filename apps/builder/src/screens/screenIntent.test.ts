import { describe, expect, it } from 'vitest';

import { diffScreenIntent, screenIntent } from './screenIntent';

// Usa só o vocabulário base do shadcnRegistry (screen/section/heading/text/button) +
// um type inventado — não depende do vocabulário financeiro do K3 (que pode não estar
// na base do épico ainda). `screenIntent` é vocabulário-agnóstico: só consulta os types.
const screen = {
  id: 'home',
  route: '/home',
  dataFlow: 'get-balance',
  root: {
    type: 'screen',
    children: [
      { type: 'heading', props: { text: 'Saldo' } },
      {
        type: 'section',
        children: [
          { type: 'text', props: { value: '{{ balance.value }}' } },
          { type: 'button', props: { label: '{{ tx.amount }}' } },
          { type: 'mystery', props: { text: 'x' } },
        ],
      },
    ],
  },
};

describe('K5 — screenIntent', () => {
  it('coleta tipos, bindings, tipos desconhecidos, rota e dataFlow', () => {
    const intent = screenIntent(screen);
    expect(intent.types).toEqual(['button', 'heading', 'mystery', 'screen', 'section', 'text']);
    expect(intent.unknownTypes).toEqual(['mystery']); // fora do shadcnRegistry
    expect(intent.bindings).toEqual(['{{ balance.value }}', '{{ tx.amount }}']);
    expect(intent.route).toBe('/home');
    expect(intent.dataFlow).toBe('get-balance');
  });

  it('é tolerante a body malformado', () => {
    expect(screenIntent(null)).toMatchObject({ types: [], bindings: [], route: '', dataFlow: '' });
    expect(screenIntent({ root: { type: 'screen', body: [{ type: 'text' }] } }).types).toEqual([
      'screen',
      'text',
    ]);
  });

  it('diffScreenIntent aponta types/bindings novos + mudança de rota/dataFlow', () => {
    const before = screenIntent({
      ...screen,
      route: '/old',
      dataFlow: 'other',
      root: { type: 'screen', children: [] },
    });
    const diff = diffScreenIntent(before, screenIntent(screen));
    expect(diff.addedTypes).toEqual(['button', 'heading', 'mystery', 'section', 'text']);
    expect(diff.addedBindings).toEqual(['{{ balance.value }}', '{{ tx.amount }}']);
    expect(diff.routeChanged).toBe(true);
    expect(diff.dataFlowChanged).toBe(true);
  });

  it('sem publicado (before null) não marca nada como mudado', () => {
    const diff = diffScreenIntent(null, screenIntent(screen));
    expect(diff.routeChanged).toBe(false);
    expect(diff.dataFlowChanged).toBe(false);
    expect(diff.removedTypes).toEqual([]);
  });
});
