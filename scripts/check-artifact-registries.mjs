/**
 * Check de sincronia dos 3 registries de artefato de contrato (H6, ADR 0006 §8). O
 * Zod do `core` → JSON Schema → modelos Dart passa por TRÊS listas que precisam casar,
 * senão um artefato novo entra no TS e some no Dart em silêncio:
 *   1. `ARTIFACTS`     em packages/core/scripts/gen-json-schema.mjs  (o que o TS emite)
 *   2. `_artifacts`    em dart/tool/generate_models.dart             (o que o Dart gera)
 *   3. `schemaArtifacts` em .../agnostic_ui_contract/.../contract_meta.dart (o drift gate Dart)
 *
 *   node scripts/check-artifact-registries.mjs
 *
 * Falha (exit 1) se os 2 registries Dart divergirem, se um artefato TS não estiver no
 * Dart nem declarado TS-only, ou se houver artefato Dart órfão (sem origem no TS).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Artefatos emitidos SÓ no TS (sem modelo Dart, conscientemente): `operator-contract`
 * é engine-only (o renderer Dart não roda operadores) e o renderer usa o props schema
 * do `component-contract` como `Map` (G6), sem modelo gerado. Drift novo deve passar
 * por aqui de propósito.
 */
const TS_ONLY = new Set(['operator-contract', 'component-contract']);

function blockAfter(file, marker) {
  const text = readFileSync(join(root, file), 'utf8');
  const start = text.indexOf(marker);
  if (start === -1) return '';
  // até o fechamento da lista/mapa (`];` ou `};`) — itens aninhados `[...]` não têm `;`.
  const close = Math.min(
    ...['];', '};'].map((c) => text.indexOf(c, start)).filter((i) => i !== -1),
  );
  return text.slice(start, close);
}

/** Stems da lista `ARTIFACTS = [['Name', 'stem', Schema], ...]` (2º quoted). */
const tsArtifacts = [
  ...blockAfter('packages/core/scripts/gen-json-schema.mjs', 'const ARTIFACTS').matchAll(
    /\['[^']+',\s*'([^']+)'/g,
  ),
].map((m) => m[1]);

/** Keys do mapa `_artifacts = { 'stem': 'dart_name', ... }`. */
const dartGen = [
  ...blockAfter('dart/tool/generate_models.dart', '_artifacts').matchAll(/'([a-z][a-z-]*)':/g),
].map((m) => m[1]);

/** Stems da lista `schemaArtifacts = <String>['stem', ...]`. */
const dartMeta = [
  ...blockAfter(
    'dart/packages/agnostic_ui_contract/lib/src/contract_meta.dart',
    'schemaArtifacts',
  ).matchAll(/'([a-z][a-z-]*)'/g),
].map((m) => m[1]);

const errors = [];
const sorted = (a) => [...a].sort();
const setEq = (a, b) => a.length === b.length && sorted(a).every((x, i) => x === sorted(b)[i]);

if (!setEq(dartGen, dartMeta)) {
  errors.push(`Dart _artifacts [${dartGen}] != schemaArtifacts [${dartMeta}]`);
}
for (const stem of tsArtifacts) {
  if (!dartGen.includes(stem) && !TS_ONLY.has(stem)) {
    errors.push(`artefato TS '${stem}' não está no gerador Dart nem em TS_ONLY`);
  }
}
for (const stem of dartGen) {
  if (!tsArtifacts.includes(stem)) errors.push(`artefato Dart '${stem}' sem origem no TS`);
}

if (tsArtifacts.length === 0 || dartGen.length === 0) {
  errors.push('falha ao parsear os registries (lista vazia)');
}

if (errors.length > 0) {
  console.error('artifacts:check FALHOU:');
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(
  `artifacts:check OK — TS ${tsArtifacts.length} (${TS_ONLY.size} TS-only), Dart ${dartGen.length}; registries em sync.`,
);
