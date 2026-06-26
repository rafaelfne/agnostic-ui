/**
 * Exporta o JSON Schema (draft-07) dos schemas Zod de contrato do `core` —
 * `TemplateNode`, `Envelope`, `TenantConfig` — em `schema/`. Esse artefato é a
 * fonte única para o codegen dos modelos Dart (`agnostic_ui_contract`) e o check
 * de drift TS↔Dart (ADR 0005 §2). NÃO editar a saída à mão.
 *
 *   node scripts/gen-json-schema.mjs           # escreve schema/*.schema.json
 *   node scripts/gen-json-schema.mjs --check   # falha (exit 1) se a saída estiver desatualizada
 *
 * Importa de `../dist`, então exige build prévio do pacote
 * (`pnpm --filter @yukilabs/agnostic-ui-core build`). Espelha a filosofia do
 * `gen:di` / `gen:di:check` do BFF.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  ComponentContractSchema,
  EnvelopeSchema,
  OperatorContractSchema,
  TemplateNodeSchema,
  TenantConfigSchema,
} from '../dist/index.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(scriptDir, '..');
const schemaDir = join(packageRoot, 'schema');

const COMMENT =
  'AUTO-GERADO por scripts/gen-json-schema.mjs — não editar à mão. Rode `pnpm --filter @yukilabs/agnostic-ui-core gen:schema`.';

/** [nome do `$ref`, stem do arquivo, schema Zod] */
const ARTIFACTS = [
  ['TemplateNode', 'template-node', TemplateNodeSchema],
  ['Envelope', 'envelope', EnvelopeSchema],
  ['TenantConfig', 'tenant-config', TenantConfigSchema],
  ['OperatorContract', 'operator-contract', OperatorContractSchema],
  ['ComponentContract', 'component-contract', ComponentContractSchema],
];

function build(name, schema) {
  const json = zodToJsonSchema(schema, { name, target: 'jsonSchema7' });
  return { $comment: COMMENT, ...json };
}

function serialize(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

const check = process.argv.includes('--check');
if (!check) mkdirSync(schemaDir, { recursive: true });

let drift = false;
for (const [name, stem, schema] of ARTIFACTS) {
  const target = join(schemaDir, `${stem}.schema.json`);
  const next = serialize(build(name, schema));
  if (check) {
    const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
    if (current !== next) {
      drift = true;
      console.error(`drift: schema/${stem}.schema.json desatualizado`);
    }
  } else {
    writeFileSync(target, next);
    console.log(`escrito schema/${stem}.schema.json`);
  }
}

if (check && drift) {
  console.error(
    'JSON Schema desatualizado — rode `pnpm --filter @yukilabs/agnostic-ui-core gen:schema` e commite a saída.',
  );
  process.exit(1);
}
