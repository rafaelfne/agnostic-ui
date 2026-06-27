import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ConformanceVectorSchema } from '../conformance/vector';

const vectors = ['vectors', 'operators'].flatMap((kindDir) => {
  const dir = fileURLToPath(new URL(`../../conformance/${kindDir}/`, import.meta.url));
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => ({
      file: `${kindDir}/${file}`,
      raw: JSON.parse(readFileSync(`${dir}${file}`, 'utf8')) as unknown,
    }));
});

describe('corpus de conformance (cross-renderer)', () => {
  it('tem ao menos um vetor', () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  it.each(vectors)('$file casa com ConformanceVectorSchema (kind + specVersion)', ({ raw }) => {
    const parsed = ConformanceVectorSchema.parse(raw);
    expect(['template', 'operator', 'component']).toContain(parsed.kind);
    expect(parsed.specVersion.length).toBeGreaterThan(0);
  });

  it('rejeita chave desconhecida (.strict fecha o escape)', () => {
    const valid = {
      kind: 'template',
      name: 'x',
      specVersion: '1.0',
      template: { type: 'text' },
      context: {},
      expected: { type: 'text' },
    };
    expect(() => ConformanceVectorSchema.parse(valid)).not.toThrow();
    expect(() => ConformanceVectorSchema.parse({ ...valid, stray: 1 })).toThrow();
  });

  it('aceita os kinds operator (runnable) e component (reservado)', () => {
    expect(() =>
      ConformanceVectorSchema.parse({
        kind: 'operator',
        name: 'op',
        specVersion: '1.0',
        step: { op: 'validate', require: ['customerId'] },
        input: { customerId: 'c1' },
        output: '{{ customerId }}',
        expect: { body: 'c1' },
      }),
    ).not.toThrow();
    expect(() =>
      ConformanceVectorSchema.parse({
        kind: 'component',
        name: 'comp',
        specVersion: '1.0',
        component: 'card-balance',
        props: { amount: '{{ x }}' },
        context: { x: 'R$ 1' },
        expected: { type: 'card-balance', props: { amount: 'R$ 1' } },
      }),
    ).not.toThrow();
  });
});
