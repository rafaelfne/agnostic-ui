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
  env: { ...process.env, DATABASE_URL: env.DB_URL },
});

const envLocalPath = join(nextDir, '.env.local');
writeFileSync(envLocalPath, renderEnvLocal(env));
console.log(`✔ .env.local escrito em ${envLocalPath}`);
console.log(`✔ Ambiente pronto. Studio: ${env.STUDIO_URL ?? '—'} · DB: ${env.DB_URL}`);
