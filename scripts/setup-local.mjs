/**
 * `pnpm setup:local` — sobe o ambiente local de um comando (ADR 0003):
 * pré-flight (Docker + Supabase CLI) → `supabase start` → aplica as migrations de
 * `drizzle/` e seeda o flow `get-balance` (fail-closed) → escreve `.env.local`.
 * Idempotente: seguro de rodar repetidas vezes.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nextDir = join(root, 'packages', 'next');

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts });
}
function ok(cmd, args) {
  try {
    sh(cmd, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function parseEnv(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) out[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  return out;
}

function renderEnvLocal(env) {
  return [
    '# Gerado por `pnpm setup:local` — não commitar (ignorado via .env*).',
    `DATABASE_URL="${env.DB_URL ?? ''}"`,
    `SUPABASE_URL="${env.API_URL ?? ''}"`,
    `SUPABASE_ANON_KEY="${env.ANON_KEY ?? ''}"`,
    `SUPABASE_SERVICE_ROLE_KEY="${env.SERVICE_ROLE_KEY ?? ''}"`,
    `JWT_HS256_SECRET="${env.JWT_SECRET ?? ''}"`,
    '# Authz do builder (ADR 0004) — o Supabase local emite tokens ES256/JWKS, então',
    '# a verificação usa o JWKS endpoint; o segredo HS256 fica como fallback legado.',
    `SUPABASE_JWT_JWKS_URL="${env.API_URL ? `${env.API_URL}/auth/v1/.well-known/jwks.json` : ''}"`,
    `SUPABASE_JWT_SECRET="${env.JWT_SECRET ?? ''}"`,
    'EGRESS_ALLOWLIST=""',
    '',
  ].join('\n');
}

console.log('▶ Pré-flight (Docker + Supabase CLI)…');
if (!ok('docker', ['info'])) {
  console.error('✗ Docker não está em execução. Suba o Docker/Colima e rode de novo.');
  process.exit(1);
}
if (!ok('supabase', ['--version'])) {
  console.error('✗ Supabase CLI não encontrada — instale: https://supabase.com/docs/guides/cli');
  process.exit(1);
}

console.log('▶ Buildando o engine (dependência do seed)…');
sh('pnpm', ['turbo', 'run', 'build', '--filter', '@yukilabs/agnostic-ui-engine'], {
  stdio: 'inherit',
});

console.log('▶ supabase start (primeira vez baixa as imagens)…');
try {
  sh('supabase', ['start'], { stdio: 'inherit' });
} catch {
  // já rodando — segue para o status
}

console.log('▶ Lendo conexão (supabase status)…');
let statusEnv;
try {
  statusEnv = sh('supabase', ['status', '-o', 'env']);
} catch {
  console.error('✗ Supabase local indisponível. Rode `supabase start` e tente de novo.');
  process.exit(1);
}
const env = parseEnv(statusEnv);
if (env.DB_URL === undefined) {
  console.error('✗ DB_URL ausente no `supabase status`.');
  process.exit(1);
}

console.log('▶ Migrations + seed…');
sh('node', ['--experimental-transform-types', join(nextDir, 'scripts', 'provision-local.ts')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: env.DB_URL,
    SUPABASE_URL: env.API_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SERVICE_ROLE_KEY,
  },
});

const envLocalPath = join(nextDir, '.env.local');
writeFileSync(envLocalPath, renderEnvLocal(env));
console.log(`✔ .env.local escrito em ${envLocalPath}`);

// O SPA (apps/builder) lê VITE_* no dev/build — gera o .env.local dele também.
const builderEnvPath = join(root, 'apps', 'builder', '.env.local');
writeFileSync(
  builderEnvPath,
  [
    '# Gerado por `pnpm setup:local` — não commitar. A anon key é pública por design.',
    `VITE_SUPABASE_URL="${env.API_URL ?? ''}"`,
    `VITE_SUPABASE_ANON_KEY="${env.ANON_KEY ?? ''}"`,
    'VITE_API_BASE=""',
    '',
  ].join('\n'),
);
console.log(`✔ .env.local escrito em ${builderEnvPath}`);
console.log(`✔ Ambiente pronto. Studio: ${env.STUDIO_URL ?? '—'} · DB: ${env.DB_URL}`);
console.log('');
console.log('▶ Para abrir o builder:');
console.log('    pnpm --filter @yukilabs/agnostic-ui-next dev      # BFF em :3000');
console.log('    pnpm --filter @yukilabs/agnostic-ui-builder dev   # SPA em :5173');
console.log('  Logins do seed (senha: builder-local-123):');
console.log('    admin@partnerco.com  (partnerco · publisher)');
console.log('    editor@partnerco.com (partnerco · editor)');
console.log('    admin@acme.com       (acme · publisher)');
