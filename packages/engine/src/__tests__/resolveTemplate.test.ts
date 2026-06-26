import { describe, expect, it } from 'vitest';

import { evaluateExpression, resolveTemplate } from '../index';

const r = (template: Parameters<typeof resolveTemplate>[0], scope: Record<string, unknown>) =>
  resolveTemplate(template, scope, evaluateExpression);

describe('resolveTemplate — dataBind (F1.A.3)', () => {
  it('expande um filho por item, com $item e $index', () => {
    const out = r(
      {
        type: 'list',
        children: [{ type: 'row', dataBind: '{{ xs }}', props: { v: '{{ $item }}-{{ $index }}' } }],
      },
      { xs: ['a', 'b'] },
    );
    expect(out.children).toEqual([
      { type: 'row', props: { v: 'a-0' } },
      { type: 'row', props: { v: 'b-1' } },
    ]);
  });

  it('array vazio ou binding não-array → zero nós (não quebra a árvore)', () => {
    expect(
      r({ type: 'l', children: [{ type: 'i', dataBind: '{{ xs }}' }] }, { xs: [] }).children,
    ).toEqual([]);
    expect(
      r({ type: 'l', children: [{ type: 'i', dataBind: '{{ missing }}' }] }, {}).children,
    ).toEqual([]);
  });

  it('não emite o directive e convive com filhos estáticos', () => {
    const out = r(
      {
        type: 'l',
        children: [
          { type: 'head' },
          { type: 'i', dataBind: '{{ xs }}', props: { v: '{{ $item }}' } },
        ],
      },
      { xs: ['x'] },
    );
    expect(out.children).toEqual([{ type: 'head' }, { type: 'i', props: { v: 'x' } }]);
  });
});
