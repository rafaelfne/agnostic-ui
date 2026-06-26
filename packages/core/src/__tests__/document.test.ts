import { describe, expect, it } from 'vitest';

import { SduiDocumentSchema } from '../schemas/document';

describe('SduiDocumentSchema', () => {
  const base = {
    screenId: 'home',
    version: '1',
    root: { type: 'screen', children: [{ type: 'text', props: { value: '{{ name }}' } }] },
    context: { name: 'Ada' },
  };

  it('aceita um documento mínimo (root bindável + context)', () => {
    expect(SduiDocumentSchema.parse(base)).toMatchObject({ screenId: 'home' });
  });

  it('aceita refresh e exception opcionais', () => {
    const doc = SduiDocumentSchema.parse({
      ...base,
      refresh: { enabled: true },
      exception: { code: 'core_error', message: 'indisponível' },
    });
    expect(doc.refresh?.enabled).toBe(true);
    expect(doc.exception?.message).toBe('indisponível');
  });

  it('rejeita screenId vazio e exception sem message', () => {
    expect(() => SduiDocumentSchema.parse({ ...base, screenId: '' })).toThrow();
    expect(() => SduiDocumentSchema.parse({ ...base, exception: { code: 'x' } })).toThrow();
  });
});
