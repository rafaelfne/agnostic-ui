/**
 * Publica o corpus de conformance como UM artefato versionado (H8, ADR 0006 §8) — a
 * **especificação pública** que terceiros consomem. Agrega todos os vetores (template
 * + operator + component), valida cada um contra `ConformanceVectorSchema` e escreve
 * `conformance/spec.json`. Espelha o `gen:schema` / drift gate.
 *
 *   node scripts/gen-conformance-spec.mjs          # escreve conformance/spec.json
 *   node scripts/gen-conformance-spec.mjs --check  # falha (exit 1) se desatualizado
 *
 * Importa de `../dist` → exige build prévio do core
 * (`pnpm --filter @yukilabs/agnostic-ui-core build`).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFORMANCE_SPEC_VERSION, ConformanceVectorSchema } from '../dist/index.js';

const conformanceDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'conformance');
const specPath = join(conformanceDir, 'spec.json');

const COMMENT =
  'AUTO-GERADO por scripts/gen-conformance-spec.mjs — não editar à mão. Rode `pnpm --filter @yukilabs/agnostic-ui-core gen:conformance`.';

const vectors = [];
for (const sub of ['vectors', 'operators', 'components']) {
  const dir = join(conformanceDir, sub);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.json'))) {
    const raw = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    vectors.push(ConformanceVectorSchema.parse(raw)); // valida (e normaliza) contra a spec
  }
}
vectors.sort((a, b) => a.name.localeCompare(b.name));

const counts = {};
for (const vector of vectors) counts[vector.kind] = (counts[vector.kind] ?? 0) + 1;

const spec = { $comment: COMMENT, specVersion: CONFORMANCE_SPEC_VERSION, counts, vectors };
const next = `${JSON.stringify(spec, null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = existsSync(specPath) ? readFileSync(specPath, 'utf8') : '';
  if (current !== next) {
    console.error(
      'drift: conformance/spec.json desatualizado — rode `pnpm --filter @yukilabs/agnostic-ui-core gen:conformance` e commite.',
    );
    process.exit(1);
  }
  console.log(`gen:conformance:check OK — spec.json em sync (${vectors.length} vetores).`);
} else {
  writeFileSync(specPath, next);
  console.log(`escrito conformance/spec.json (${vectors.length} vetores).`);
}
