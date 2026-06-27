import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { resolveTree } from '../binding';

interface Vector {
  name: string;
  locale?: string;
  template: TemplateNode;
  context: Record<string, unknown>;
  expected: TemplateNode;
}

const vectorsDir = fileURLToPath(new URL('../../../core/conformance/vectors/', import.meta.url));
const vectors: Vector[] = readdirSync(vectorsDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(`${vectorsDir}${file}`, 'utf8')) as Vector);

describe('conformance — binding do React vs corpus do core (H1)', () => {
  it('carrega o corpus compartilhado do core', () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  it.each(vectors)('$name: template + context → expected', (vector) => {
    expect(resolveTree(vector.template, vector.context)).toEqual(vector.expected);
  });
});
