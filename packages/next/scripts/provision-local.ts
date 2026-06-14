/**
 * Provisiona o Postgres local + o Supabase Auth local para o ambiente de dev:
 *  1. aplica as migrations de `drizzle/`;
 *  2. seeda artefatos de exemplo no config store (flows/screen/integration/event/
 *     hook) para dois tenants — partnerco (rico, espelha o protótipo do builder) e
 *     acme — com múltiplas versões e timestamps retroativos (para o dashboard ter
 *     "this week" e a série de publishes de 7 dias). Versões publicadas são
 *     validadas fail-closed (schema do engine + dry-run nos flows); drafts podem
 *     ser inválidos de propósito (ex.: um flow "com issue").
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
  EventDefSchema,
  FlowDefinitionSchema,
  HookDefSchema,
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

const NOW = Date.now();
const daysAgo = (n: number): string => new Date(NOW - n * 86_400_000).toISOString();

type Kind = 'flow' | 'integration' | 'screen' | 'event' | 'hook';

interface SeedVersion {
  version: number;
  status: 'draft' | 'published';
  body: Record<string, unknown>;
  createdAt: string;
  publishedAt: string | null;
}
interface SeedArtifact {
  tenantId: string;
  kind: Kind;
  slug: string;
  createdAt: string;
  versions: SeedVersion[];
}

const titleize = (slug: string): string =>
  slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

const flowBody = (slug: string, path: string, op: string, as: string): Record<string, unknown> => ({
  id: slug,
  name: titleize(slug),
  trigger: { kind: 'http', method: 'GET', path },
  input: { from: 'executionContext', pick: ['customerId'] },
  steps: [
    { op: 'validate', require: ['customerId'] },
    { op: 'call-integration', integration: 'core', operation: op, as },
  ],
  output: `{{ ${as} }}`,
});
/** Intentionally invalid (steps empty) — a draft "com issue" for the dashboard. */
const brokenFlowBody = (slug: string): Record<string, unknown> => ({
  id: slug,
  name: titleize(slug),
  steps: [],
  output: '{{ x }}',
});
const screenBody = (id: string, route: string): Record<string, unknown> => ({
  id,
  route,
  dataFlow: 'get-balance',
  root: {
    type: 'screen',
    children: [{ type: 'heading', props: { title: titleize(id), level: 1 } }],
  },
});
const integrationBody = (id: string): Record<string, unknown> => ({
  id,
  name: titleize(id),
  kind: 'mock',
  operations: [{ id: 'getData' }],
});
const eventBody = (name: string): Record<string, unknown> => ({ name });
const hookBody = (): Record<string, unknown> => ({
  phase: 'after',
  scope: 'flow',
  action: { builtin: 'log' },
});

/** Builds `count` versions sharing `body`; marks `publishedVersion` published at `publishedDaysAgo`. */
function mkVersions(opts: {
  count: number;
  body: Record<string, unknown>;
  createdDaysAgo: number;
  publishedVersion?: number;
  publishedDaysAgo?: number;
  latestBody?: Record<string, unknown>;
}): SeedVersion[] {
  return Array.from({ length: opts.count }, (_, i) => {
    const version = i + 1;
    const isLatest = version === opts.count;
    const isPublished = version === opts.publishedVersion;
    return {
      version,
      status: isPublished ? 'published' : 'draft',
      body: isLatest && opts.latestBody ? opts.latestBody : opts.body,
      createdAt: daysAgo(opts.createdDaysAgo - i),
      publishedAt: isPublished ? daysAgo(opts.publishedDaysAgo ?? 0) : null,
    };
  });
}

// partnerco — espelha o protótipo do dashboard (10 artefatos: 7 publicados, 3 drafts,
// 4 flows com 1 "com issue", 2 criados nos últimos 7 dias).
const balance = flowBody('get-balance', '/api/balance', 'getBalance', 'balance');
const partnerco: SeedArtifact[] = [
  {
    tenantId: 'partnerco',
    kind: 'flow',
    slug: 'get-balance',
    createdAt: daysAgo(20),
    versions: mkVersions({
      count: 3,
      body: balance,
      createdDaysAgo: 20,
      publishedVersion: 2,
      publishedDaysAgo: 6,
    }),
  },
  {
    tenantId: 'partnerco',
    kind: 'flow',
    slug: 'transfer-funds',
    createdAt: daysAgo(3),
    versions: mkVersions({ count: 1, body: brokenFlowBody('transfer-funds'), createdDaysAgo: 3 }),
  },
  {
    tenantId: 'partnerco',
    kind: 'flow',
    slug: 'kyc-onboarding',
    createdAt: daysAgo(25),
    versions: mkVersions({
      count: 5,
      body: flowBody('kyc-onboarding', '/api/kyc', 'getData', 'kyc'),
      createdDaysAgo: 25,
      publishedVersion: 5,
      publishedDaysAgo: 5,
    }),
  },
  {
    tenantId: 'partnerco',
    kind: 'flow',
    slug: 'invest-screen',
    createdAt: daysAgo(15),
    versions: mkVersions({
      count: 2,
      body: flowBody('invest-screen', '/api/invest', 'getData', 'invest'),
      createdDaysAgo: 15,
      publishedVersion: 1,
      publishedDaysAgo: 4,
    }),
  },
  {
    tenantId: 'partnerco',
    kind: 'screen',
    slug: 'balance-screen',
    createdAt: daysAgo(18),
    versions: mkVersions({
      count: 4,
      body: screenBody('balance-screen', '/balance'),
      createdDaysAgo: 18,
      publishedVersion: 4,
      publishedDaysAgo: 2,
    }),
  },
  {
    tenantId: 'partnerco',
    kind: 'screen',
    slug: 'invest-ui',
    createdAt: daysAgo(1),
    versions: mkVersions({ count: 2, body: screenBody('invest-ui', '/invest'), createdDaysAgo: 1 }),
  },
  {
    tenantId: 'partnerco',
    kind: 'integration',
    slug: 'core-banking',
    createdAt: daysAgo(12),
    versions: mkVersions({
      count: 2,
      body: integrationBody('core-banking'),
      createdDaysAgo: 12,
      publishedVersion: 2,
      publishedDaysAgo: 2,
    }),
  },
  {
    tenantId: 'partnerco',
    kind: 'integration',
    slug: 'kyc-provider',
    createdAt: daysAgo(12),
    versions: mkVersions({
      count: 1,
      body: integrationBody('kyc-provider'),
      createdDaysAgo: 12,
      publishedVersion: 1,
      publishedDaysAgo: 1,
    }),
  },
  {
    tenantId: 'partnerco',
    kind: 'event',
    slug: 'balance-viewed',
    createdAt: daysAgo(8),
    versions: mkVersions({
      count: 1,
      body: eventBody('balance-viewed'),
      createdDaysAgo: 8,
      publishedVersion: 1,
      publishedDaysAgo: 0,
    }),
  },
  {
    tenantId: 'partnerco',
    kind: 'hook',
    slug: 'on-login-audit',
    createdAt: daysAgo(9),
    versions: mkVersions({ count: 1, body: hookBody(), createdDaysAgo: 9 }),
  },
];

// acme — menor, prova o isolamento por tenant.
const acme: SeedArtifact[] = [
  {
    tenantId: 'acme',
    kind: 'flow',
    slug: 'get-balance',
    createdAt: daysAgo(10),
    versions: mkVersions({
      count: 1,
      body: balance,
      createdDaysAgo: 10,
      publishedVersion: 1,
      publishedDaysAgo: 3,
    }),
  },
  {
    tenantId: 'acme',
    kind: 'screen',
    slug: 'dashboard',
    createdAt: daysAgo(2),
    versions: mkVersions({ count: 1, body: screenBody('dashboard', '/'), createdDaysAgo: 2 }),
  },
];

const SEED: SeedArtifact[] = [...partnerco, ...acme];

const SCHEMA_BY_KIND: Record<Kind, ZodTypeAny> = {
  flow: FlowDefinitionSchema,
  integration: IntegrationDefinitionSchema,
  screen: ScreenDefSchema,
  event: EventDefSchema,
  hook: HookDefSchema,
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

/** Fail-closed para versões publicadas: schema do engine; dry-run adicional em flow. Drafts não são validados. */
async function validatePublished(artifact: SeedArtifact, v: SeedVersion): Promise<void> {
  if (v.status !== 'published') return;
  const schema = SCHEMA_BY_KIND[artifact.kind];
  const parsed = schema.safeParse(v.body);
  if (!parsed.success) {
    console.error(
      `✗ seed inválido (${artifact.kind}/${artifact.slug} v${v.version}): ${parsed.error.message}`,
    );
    process.exit(1);
  }
  if (artifact.kind !== 'flow') return;
  const flow = FlowDefinitionSchema.parse(v.body);
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
    console.error(`✗ dry-run do seed falhou (${artifact.slug} v${v.version}): ${dry.error.code}`);
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
    for (const v of artifact.versions) await validatePublished(artifact, v);
    await sql.begin(async (tx) => {
      const [row] = await tx`
        INSERT INTO config_artifact (tenant_id, kind, slug, created_at)
        VALUES (${artifact.tenantId}, ${artifact.kind}, ${artifact.slug}, ${artifact.createdAt})
        RETURNING id`;
      const artifactId = row!.id;
      for (const v of artifact.versions) {
        await tx`
          INSERT INTO config_version (artifact_id, version, status, body, created_at, published_at)
          VALUES (${artifactId}, ${v.version}, ${v.status}, ${sql.json(v.body)}, ${v.createdAt}, ${v.publishedAt})`;
      }
    });
    const pub = artifact.versions.find((v) => v.status === 'published');
    const latest = artifact.versions.length;
    console.log(
      `✔ seed: ${artifact.tenantId}/${artifact.kind}/${artifact.slug} (v${latest}${pub ? `, pub v${pub.version}` : ', draft'})`,
    );
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
