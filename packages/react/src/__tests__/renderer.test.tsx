import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { defaultRegistry } from '../primitives';
import { createRegistry } from '../registry';
import { SduiRenderer, type SduiRendererProps } from '../renderer';

const render = (node: TemplateNode, opts: Omit<SduiRendererProps, 'node'> = {}): string =>
  renderToStaticMarkup(<SduiRenderer node={node} {...opts} />);

describe('SduiRenderer', () => {
  it('renders a tree via the default registry', () => {
    const node: TemplateNode = {
      type: 'screen',
      children: [
        { type: 'heading', props: { title: 'Investir' } },
        { type: 'text', props: { text: 'Olá' } },
      ],
    };
    expect(render(node)).toBe('<div data-sdui="screen"><h2>Investir</h2><span>Olá</span></div>');
  });

  it('marks an unknown component type without dropping its children', () => {
    const node: TemplateNode = {
      type: 'mystery',
      children: [{ type: 'text', props: { text: 'x' } }],
    };
    const html = render(node);
    expect(html).toContain('data-sdui-unknown="mystery"');
    expect(html).toContain('<span>x</span>');
  });

  it('resolves {{ }} placeholders against the scope', () => {
    const node: TemplateNode = { type: 'heading', props: { title: '{{ flow.title }}' } };
    expect(render(node, { scope: { flow: { title: 'Saldo' } } })).toBe('<h2>Saldo</h2>');
  });

  it('renders custom components from an extended registry', () => {
    const registry = createRegistry(defaultRegistry, {
      badge: ({ props }) => <em data-badge>{String(props.label)}</em>,
    });
    const node: TemplateNode = { type: 'badge', props: { label: 'novo' } };
    expect(render(node, { registry })).toBe('<em data-badge="true">novo</em>');
  });
});
