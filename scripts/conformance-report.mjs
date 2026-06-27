/**
 * Gate de divergência cross-renderer (H3, ADR 0006 §8). Hoje cada renderer asserta
 * contra `expected` na sua própria suíte; este agregador transforma isso num gate
 * único: prova que **os 3 renderers cobrem o corpus** (nenhum cai em silêncio) e que
 * o oráculo (engine) — e o React, quando carregável headless — concordam com cada
 * vetor. Sai != 0 se um runner some, deixa de cobrir o corpus, ou diverge.
 *
 *   node scripts/conformance-report.mjs   # exige os pacotes buildados (turbo build)
 *
 * O React e o Dart também asseguram paridade contra o MESMO `expected` nas suas
 * suítes (turbo test / dart:ci), então concordam transitivamente com o oráculo.
 */
import { deepStrictEqual } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateExpression, resolveTemplate, runFlow } from '../packages/engine/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vectorsDir = join(root, 'packages/core/conformance/vectors');

const vectors = readdirSync(vectorsDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(join(vectorsDir, file), 'utf8')));

/** Os 3 runners de conformância: cada um deve existir e ler o corpus compartilhado. */
const runners = [
  ['engine', 'packages/engine/src/__tests__/conformance.test.ts'],
  ['react', 'packages/react/src/__tests__/conformance.test.ts'],
  ['dart', 'dart/packages/agnostic_ui_contract/test/conformance_test.dart'],
];

let failures = 0;

function agrees(resolved, expected) {
  try {
    deepStrictEqual(resolved, expected);
    return true;
  } catch {
    return false;
  }
}

console.log(`Corpus: ${vectors.length} vetores.\n`);
if (vectors.length === 0) {
  console.error('FALHA: corpus vazio.');
  process.exit(1);
}

// 1) Cobertura: cada renderer tem um runner que lê o corpus compartilhado.
console.log('Cobertura dos runners:');
for (const [name, path] of runners) {
  const full = join(root, path);
  const ok = existsSync(full) && readFileSync(full, 'utf8').includes('conformance/vectors');
  console.log(`  ${name.padEnd(8)} ${ok ? 'ok' : 'AUSENTE / não lê o corpus'}`);
  if (!ok) failures += 1;
}

// 2) Execução: o engine (oráculo) sempre; o React quando o dist carrega headless.
let resolveTree = null;
try {
  ({ resolveTree } = await import('../packages/react/dist/index.js'));
} catch (error) {
  console.warn(`\n(react não executável neste script: ${error.message} — coberto via turbo test)`);
}

const executable = [
  [
    'engine',
    (v) =>
      resolveTemplate(
        v.template,
        v.context,
        evaluateExpression,
        v.locale ? { locale: v.locale } : undefined,
      ),
  ],
  ...(resolveTree ? [['react', (v) => resolveTree(v.template, v.context)]] : []),
];

console.log(`\nMatriz renderer × vetor (${executable.map(([n]) => n).join(', ')}):`);
for (const vector of vectors) {
  const cells = executable.map(([name, run]) => {
    let ok = false;
    try {
      ok = agrees(run(vector), vector.expected);
    } catch {
      ok = false;
    }
    if (!ok) failures += 1;
    return `${name}:${ok ? 'ok' : 'DIVERGE'}`;
  });
  console.log(`  ${String(vector.name ?? '?').padEnd(20)} ${cells.join('  ')}`);
}

// 3) Operadores (engine-only, H5): executa cada vetor `operator` do corpus.
const opsDir = join(root, 'packages/core/conformance/operators');
const opVectors = existsSync(opsDir)
  ? readdirSync(opsDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => JSON.parse(readFileSync(join(opsDir, file), 'utf8')))
  : [];
const live = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_1' };

console.log(`\nOperadores (engine) × ${opVectors.length} vetores:`);
for (const v of opVectors) {
  let ok = false;
  try {
    const flow = {
      id: 'op',
      name: v.name,
      input: { from: 'request', pick: Object.keys(v.input ?? {}) },
      steps: [v.step],
      output: v.output,
    };
    const result = await runFlow(
      flow,
      { auth: live, request: v.input ?? {} },
      { integrationRunner: { run: async () => v.integrationResult ?? {} } },
    );
    if (v.expect.errorKind !== undefined) {
      ok = !result.ok && result.error.kind === v.expect.errorKind;
    } else if (result.ok) {
      ok = true;
      if (v.expect.body !== undefined) ok = ok && agrees(result.body, v.expect.body);
      if (v.expect.emits !== undefined) {
        ok =
          ok &&
          agrees(
            result.emitted.map((event) => event.event),
            v.expect.emits,
          );
      }
    }
  } catch {
    ok = false;
  }
  console.log(`  ${String(v.name ?? '?').padEnd(20)} engine:${ok ? 'ok' : 'DIVERGE'}`);
  if (!ok) failures += 1;
}

if (failures > 0) {
  console.error(`\nconformance:check FALHOU — ${failures} problema(s).`);
  process.exit(1);
}
console.log('\nconformance:check OK — corpus coberto; renderers + operadores concordam.');
