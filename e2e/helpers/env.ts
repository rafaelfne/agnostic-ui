import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Portas dedicadas do E2E — não colidem com o dev padrão (BFF :3000, SPA :5173 do dev). */
export const BFF_PORT = 3100;
export const SPA_PORT = 5173;
export const BFF_URL = `http://localhost:${BFF_PORT}`;
export const SPA_URL = `http://localhost:${SPA_PORT}`;

/** Lê um .env.local (KEY="value") do repo — sem dep, tolerante a ausência. */
function readEnvFile(rel: string): Record<string, string> {
  try {
    const txt = readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');
    const out: Record<string, string> = {};
    for (const line of txt.split('\n')) {
      const m = /^([A-Z0-9_]+)="?([^"]*)"?$/.exec(line.trim());
      if (m) out[m[1]] = m[2];
    }
    return out;
  } catch {
    return {};
  }
}

const nextEnv = readEnvFile('packages/next/.env.local');

/** Supabase local (auth GoTrue) — do .env.local do BFF, com fallback às portas do ADR 0003. */
export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? nextEnv.SUPABASE_URL ?? 'http://127.0.0.1:55421';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? nextEnv.SUPABASE_ANON_KEY ?? '';
