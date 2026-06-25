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

  it.each(vectors)('$file casa com ConformanceVectorSchema', ({ raw }) => {
    expect(() => ConformanceVectorSchema.parse(raw)).not.toThrow();
  });
});
