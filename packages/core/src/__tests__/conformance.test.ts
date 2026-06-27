import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ConformanceVectorSchema } from '../conformance/vector';

const vectorsDir = fileURLToPath(new URL('../../conformance/vectors/', import.meta.url));

const vectors = readdirSync(vectorsDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({
    file,
    raw: JSON.parse(readFileSync(`${vectorsDir}${file}`, 'utf8')) as unknown,
  }));

describe('corpus de conformance (cross-renderer)', () => {
  it('tem ao menos um vetor', () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  it.each(vectors)('$file casa com ConformanceVectorSchema e declara specVersion', ({ raw }) => {
    const parsed = ConformanceVectorSchema.parse(raw);
    expect(parsed.specVersion.length).toBeGreaterThan(0);
  });

  it('rejeita chave desconhecida (.strict fecha o escape)', () => {
    const valid = {
      name: 'x',
      specVersion: '1.0',
      template: { type: 'text' },
      context: {},
      expected: { type: 'text' },
    };
    expect(() => ConformanceVectorSchema.parse(valid)).not.toThrow();
    expect(() => ConformanceVectorSchema.parse({ ...valid, stray: 1 })).toThrow();
  });
});
