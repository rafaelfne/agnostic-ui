/**
 * Provisiona o Postgres local: aplica as migrations de `drizzle/` e publica o flow
 * de referência (`get-balance`) no config store, fail-closed (valida no schema do
 * engine + dry-run antes de publicar). Chamado por `scripts/setup-local.mjs` com
 * `DATABASE_URL` apontando para o Supabase local. Rode via
 * `node --experimental-transform-types`.
 *
 * Auto-contido de propósito: depende só do pacote engine (build) + `postgres` +
 * `node:fs`, evitando os imports bundler-style do `src` (que o Node ESM não resolve).
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlowDefinitionSchema, runFlow } from '@yukilabs/agnostic-ui-engine';
import postgres from 'postgres';

const url = process.env.DATABASE_URL ?? process.argv[2];
if (url === undefined || url === '') {
  console.error('✗ DATABASE_URL ausente');
  process.exit(1);
}

const drizzleDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');
const MIGRATIONS = ['0000_init.sql', '0001_rls.sql'];

// Espelha packages/next/src/infra/engine/flows/getBalanceFlow.ts (flow de seed).
const getBalanceFlow = {
  id: 'get-balance',
  name: 'Get Balance',
  trigger: { kind: 'http', method: 'GET', path: '/api/balance' },
  input: { from: 'executionContext', pick: ['customerId'] },
  steps: [
    { op: 'validate', require: ['customerId'] },
    { op: 'call-integration', integration: 'core', operation: 'getBalance', as: 'balance' },
  ],
  output: '{{ balance }}',
};

const ref = { tenantId: 'partnerco', kind: 'flow', slug: 'get-balance' };

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  for (const file of MIGRATIONS) {
    await sql.unsafe(await readFile(join(drizzleDir, file), 'utf8')).simple();
  }
  console.log('✔ migrations aplicadas');

  // Fail-closed (ADR 0002 §4): schema do engine + dry-run antes de publicar.
  const parsed = FlowDefinitionSchema.safeParse(getBalanceFlow);
  if (!parsed.success) {
    console.error('✗ flow de seed inválido no schema do engine');
    process.exit(1);
  }
  const dry = await runFlow(
    parsed.data,
    {
      auth: {
        mode: 'sandbox',
        tenantId: ref.tenantId,
        customerId: 'dryrun',
        mockProfile: 'happyPath',
      },
    },
    { integrationRunner: { run: async () => ({}) } },
  );
  if (!dry.ok && (dry.error.kind === 'config' || dry.error.kind === 'expression')) {
    console.error(`✗ dry-run do seed falhou: ${dry.error.code}`);
    process.exit(1);
  }

  const published = await sql`
    SELECT v.id FROM config_version v
    JOIN config_artifact a ON a.id = v.artifact_id
    WHERE a.tenant_id = ${ref.tenantId} AND a.kind = ${ref.kind} AND a.slug = ${ref.slug}
      AND v.status = 'published'
    LIMIT 1`;
  if (published.length > 0) {
    console.log('• seed: get-balance já publicado — pulando');
  } else {
    await sql.begin(async (tx) => {
      const [artifact] = await tx`
        INSERT INTO config_artifact (tenant_id, kind, slug)
        VALUES (${ref.tenantId}, ${ref.kind}, ${ref.slug})
        ON CONFLICT (tenant_id, kind, slug) DO UPDATE SET slug = EXCLUDED.slug
        RETURNING id`;
      const artifactId = artifact!.id;
      const [next] = await tx`
        SELECT COALESCE(MAX(version), 0) + 1 AS v FROM config_version WHERE artifact_id = ${artifactId}`;
      const version = next!.v;
      await tx`
        INSERT INTO config_version (artifact_id, version, status, body)
        VALUES (${artifactId}, ${version}, 'draft', ${sql.json(getBalanceFlow)})`;
      await tx`
        UPDATE config_version SET status = 'draft', published_at = NULL
        WHERE artifact_id = ${artifactId} AND status = 'published'`;
      await tx`
        UPDATE config_version SET status = 'published', published_at = now()
        WHERE artifact_id = ${artifactId} AND version = ${version}`;
    });
    console.log('✔ seed: get-balance publicado (v1)');
  }
} finally {
  await sql.end();
}
