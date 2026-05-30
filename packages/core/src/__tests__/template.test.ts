import { describe, it, expect } from 'vitest';
import { TemplateNodeSchema, type TemplateNode } from '../schemas/template';

const tree: TemplateNode = {
  type: 'container',
  id: 'root',
  props: { padding: 16 },
  children: [
    {
      type: 'tabs',
      props: { active: 0 },
      body: [
        {
          type: 'tab',
          props: { label: 'Home' },
          children: [{ type: 'text', props: { value: 'Hi' } }],
        },
        { type: 'tab', props: { label: 'Profile' } },
      ],
    },
  ],
};

describe('TemplateNodeSchema', () => {
  it('validates a nested container > tabs tree', () => {
    expect(TemplateNodeSchema.safeParse(tree).success).toBe(true);
  });

  it('rejects a node missing the required type', () => {
    expect(TemplateNodeSchema.safeParse({ id: 'x', props: {} }).success).toBe(false);
  });

  it('rejects non-array children', () => {
    expect(TemplateNodeSchema.safeParse({ type: 'container', children: {} }).success).toBe(false);
  });
});
