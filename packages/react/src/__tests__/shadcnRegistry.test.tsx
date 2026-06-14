import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SduiRenderer } from '../renderer';
import { SHADCN_REGISTRY_TYPES, createShadcnRegistry, shadcnRegistry } from '../shadcnRegistry';

const render = (node: TemplateNode, registry = shadcnRegistry): string =>
  renderToStaticMarkup(<SduiRenderer node={node} registry={registry} />);

describe('shadcnRegistry', () => {
  it('maps the full SDUI vocabulary to shadcn-class markup', () => {
    const node: TemplateNode = {
      type: 'screen',
      children: [
        { type: 'heading', props: { title: 'Saldo' } },
        { type: 'text', props: { text: 'Olá', muted: true } },
        { type: 'button', props: { label: 'Investir', variant: 'secondary' } },
      ],
    };
    const html = render(node);
    expect(html).toContain('data-sdui="screen"');
    expect(html).toContain('Saldo');
    expect(html).toContain('text-muted-foreground'); // muted text token
    expect(html).toContain('bg-secondary'); // secondary button variant
    expect(html).toContain('Investir');
  });

  it('renders a chart node with Recharts without throwing', () => {
    const node: TemplateNode = {
      type: 'chart',
      props: { kind: 'bar', data: [{ name: 'a', value: 1 }], height: 200 },
    };
    const html = render(node);
    expect(html).toContain('w-full'); // the responsive chart wrapper
  });

  it('throws on an unknown type — no raw-HTML fallback (brief §6)', () => {
    expect(() => render({ type: 'totally-unknown' })).toThrow(/Unknown SDUI type/);
  });

  it('exposes the natively-mapped types, including chart', () => {
    expect(SHADCN_REGISTRY_TYPES).toEqual(
      expect.arrayContaining([
        'screen',
        'section',
        'stack',
        'heading',
        'text',
        'button',
        'image',
        'chart',
      ]),
    );
  });

  it('lets a host override a type (and the override counts as known)', () => {
    const registry = createShadcnRegistry({
      badge: ({ props }) => <span data-badge>{String(props.label ?? '')}</span>,
    });
    expect(render({ type: 'badge', props: { label: 'novo' } }, registry)).toContain(
      '<span data-badge="true">novo</span>',
    );
  });
});
