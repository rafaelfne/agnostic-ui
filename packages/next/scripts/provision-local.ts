/**
 * Provisiona o Postgres local + o Supabase Auth local para o ambiente de dev:
 *  1. aplica as migrations de `drizzle/`;
 *  2. seeda artefatos de exemplo no config store (flows/screen/integration) para
 *     dois tenants — partnerco e acme — validando fail-closed (schema do engine +
 *     dry-run nos flows) antes de publicar;
 *  3. cria os usuários do builder no Supabase Auth (app_metadata: tenant_id +
 *     builder_roles), se `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` vierem no env.
 *
 * Chamado por `scripts/setup-local.mjs`. Rode via `node --experimental-transform-types`.
 * **Idempotente**: artefato que já tem versão é pulado; usuário que já existe é pulado.
 *
 * Auto-contido de propósito: depende só do pacote engine (build) + `postgres` +
 * `node:fs` + `fetch` global, evitando os imports bundler-style do `src`.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FlowDefinitionSchema,
  IntegrationDefinitionSchema,
  ScreenDefSchema,
  runFlow,
} from '@yukilabs/agnostic-ui-engine';
import postgres from 'postgres';
import type { ZodTypeAny } from 'zod';

const url = process.env.DATABASE_URL ?? process.argv[2];
if (url === undefined || url === '') {
  console.error('✗ DATABASE_URL ausente');
  process.exit(1);
}

const drizzleDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');
const MIGRATIONS = ['0000_init.sql', '0001_rls.sql'];

type Kind = 'flow' | 'integration' | 'screen';
interface SeedArtifact {
  tenantId: string;
  kind: Kind;
  slug: string;
  body: Record<string, unknown>;
  publish: boolean;
}

// Espelha o flow de referência (packages/next/src/infra/engine/flows/getBalanceFlow.ts).
const balanceFlow = (path: string): Record<string, unknown> => ({
  id: 'get-balance',
  name: 'Get Balance',
  trigger: { kind: 'http', method: 'GET', path },
  input: { from: 'executionContext', pick: ['customerId'] },
  steps: [
    { op: 'validate', require: ['customerId'] },
    { op: 'call-integration', integration: 'core', operation: 'getBalance', as: 'balance' },
  ],
  output: '{{ balance }}',
});

const portfolioFlow: Record<string, unknown> = {
  id: 'get-portfolio',
  name: 'Get Portfolio',
  trigger: { kind: 'http', method: 'GET', path: '/api/portfolio' },
  input: { from: 'executionContext', pick: ['customerId'] },
  steps: [
    { op: 'validate', require: ['customerId'] },
    { op: 'call-integration', integration: 'core', operation: 'getPortfolio', as: 'portfolio' },
  ],
  output: '{{ portfolio }}',
};

const homeScreen: Record<string, unknown> = {
  id: 'home',
  route: '/home',
  dataFlow: 'get-balance',
  root: {
    type: 'screen',
    children: [
      { type: 'heading', props: { title: 'Seu saldo', level: 1 } },
      { type: 'text', props: { text: 'Bem-vindo de volta.', muted: true } },
      { type: 'button', props: { label: 'Investir', variant: 'primary' } },
    ],
  },
};

const coreIntegration: Record<string, unknown> = {
  id: 'core',
  name: 'Core API',
  kind: 'mock',
  operations: [{ id: 'getBalance' }, { id: 'getPortfolio' }],
};

const acmeScreen: Record<string, unknown> = {
  id: 'dashboard',
  route: '/',
  dataFlow: 'get-balance',
  root: {
    type: 'screen',
    children: [{ type: 'heading', props: { title: 'Acme Invest', level: 1 } }],
  },
};

const SEED: SeedArtifact[] = [
  {
    tenantId: 'partnerco',
    kind: 'flow',
    slug: 'get-balance',
    body: balanceFlow('/api/balance'),
    publish: true,
  },
  {
    tenantId: 'partnerco',
    kind: 'flow',
    slug: 'get-portfolio',
    body: portfolioFlow,
    publish: false,
  },
  { tenantId: 'partnerco', kind: 'screen', slug: 'home', body: homeScreen, publish: true },
  {
    tenantId: 'partnerco',
    kind: 'integration',
    slug: 'core',
    body: coreIntegration,
    publish: true,
  },
  {
    tenantId: 'acme',
    kind: 'flow',
    slug: 'get-balance',
    body: balanceFlow('/api/balance'),
    publish: true,
  },
  { tenantId: 'acme', kind: 'screen', slug: 'dashboard', body: acmeScreen, publish: false },
];

const SCHEMA_BY_KIND: Record<Kind, ZodTypeAny> = {
  flow: FlowDefinitionSchema,
  integration: IntegrationDefinitionSchema,
  screen: ScreenDefSchema,
};

interface SeedUser {
  email: string;
  tenantId: string;
  roles: string[];
}
const SEED_PASSWORD = 'builder-local-123';
const SEED_USERS: SeedUser[] = [
  { email: 'admin@partnerco.com', tenantId: 'partnerco', roles: ['publisher'] },
  { email: 'editor@partnerco.com', tenantId: 'partnerco', roles: ['editor'] },
  { email: 'admin@acme.com', tenantId: 'acme', roles: ['publisher'] },
];

/** Fail-closed: schema do engine para todo kind; dry-run adicional para flow. */
async function validate(artifact: SeedArtifact): Promise<void> {
  const parsed = SCHEMA_BY_KIND[artifact.kind].safeParse(artifact.body);
  if (!parsed.success) {
    console.error(`✗ seed inválido (${artifact.kind}/${artifact.slug}): ${parsed.error.message}`);
    process.exit(1);
  }
  if (artifact.kind !== 'flow') return;
  const flow = FlowDefinitionSchema.parse(artifact.body);
  const request: Record<string, unknown> = {};
  for (const field of flow.input.pick) request[field] = 'dryrun';
  const dry = await runFlow(
    flow,
    {
      auth: {
        mode: 'sandbox',
        tenantId: artifact.tenantId,
        customerId: 'dryrun',
        mockProfile: 'happyPath',
      },
      request,
    },
    { integrationRunner: { run: async () => ({}) } },
  );
  if (!dry.ok && (dry.error.kind === 'config' || dry.error.kind === 'expression')) {
    console.error(`✗ dry-run do seed falhou (${artifact.slug}): ${dry.error.code}`);
    process.exit(1);
  }
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  for (const file of MIGRATIONS) {
    await sql.unsafe(await readFile(join(drizzleDir, file), 'utf8')).simple();
  }
  console.log('✔ migrations aplicadas');

  for (const artifact of SEED) {
    await validate(artifact);
    const existing = await sql`
      SELECT v.id FROM config_version v
      JOIN config_artifact a ON a.id = v.artifact_id
      WHERE a.tenant_id = ${artifact.tenantId} AND a.kind = ${artifact.kind} AND a.slug = ${artifact.slug}
      LIMIT 1`;
    if (existing.length > 0) {
      console.log(
        `• seed: ${artifact.tenantId}/${artifact.kind}/${artifact.slug} já existe — pulando`,
      );
      continue;
    }
    await sql.begin(async (tx) => {
      const [row] = await tx`
        INSERT INTO config_artifact (tenant_id, kind, slug)
        VALUES (${artifact.tenantId}, ${artifact.kind}, ${artifact.slug})
        ON CONFLICT (tenant_id, kind, slug) DO UPDATE SET slug = EXCLUDED.slug
        RETURNING id`;
      const artifactId = row!.id;
      await tx`
        INSERT INTO config_version (artifact_id, version, status, body)
        VALUES (${artifactId}, 1, ${artifact.publish ? 'published' : 'draft'}, ${sql.json(artifact.body)})`;
      if (artifact.publish) {
        await tx`UPDATE config_version SET published_at = now() WHERE artifact_id = ${artifactId} AND version = 1`;
      }
    });
    const state = artifact.publish ? 'published' : 'draft';
    console.log(`✔ seed: ${artifact.tenantId}/${artifact.kind}/${artifact.slug} (${state})`);
  }

  await seedUsers();
} finally {
  await sql.end();
}

/** Cria os usuários do builder no Supabase Auth (idempotente). No-op sem credenciais admin. */
async function seedUsers(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.log('• seed de usuários pulado (SUPABASE_URL/SERVICE_ROLE_KEY ausentes)');
    return;
  }
  for (const user of SEED_USERS) {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: SEED_PASSWORD,
        email_confirm: true,
        app_metadata: { tenant_id: user.tenantId, builder_roles: user.roles },
      }),
    });
    if (res.ok) {
      console.log(`✔ user: ${user.email} (${user.tenantId}/${user.roles.join(',')})`);
      continue;
    }
    const text = await res.text();
    if (res.status === 422 || /already|exists|registered/i.test(text)) {
      console.log(`• user: ${user.email} já existe — pulando`);
    } else {
      console.warn(`⚠ user: ${user.email} falhou (${res.status}): ${text.slice(0, 120)}`);
    }
  }
}
