/* eslint-disable */
// ============================================================================
// SPIKE — DESCARTÁVEL. Não é código de produção; é um experimento para responder
// UMA pergunta antes de investir na Fase A do meta-engine:
//
//   "O modelo de config declarativa que desenhei consegue reproduzir, sem código
//    específico de domínio, o use case GetBalance que hoje é TypeScript?"
//
// Se sim, o vocabulário de operadores (validate / call-integration / output +
// mapeamento de erro) está validado. Se não, descobrimos barato.
//
// Zero dependências. Roda com:  node docs/spikes/getbalance-flow.spike.ts
// (Node >= 22.18 — type stripping nativo).
//
// O que é fiel ao repo de hoje:
//   - fixtures de balance (happyPath / empty)            packages/next/.../fixtures/balance.ts
//   - reconciliação por MockProfile (error / slow / ...) packages/next/.../mock/withProfile.ts
//   - pipeline validate → executar → responder           packages/next/.../BalanceController.ts
//   - mapeamento de erro → HTTP                          CLAUDE.md (tabela) + mockGatewayError 500
// ============================================================================

// ---------------------------------------------------------------------------
// 1) MODELO DE CONFIG (mínimo). No engine real cada um destes é um schema Zod.
//    Aqui são só tipos TS para o spike ser executável e legível.
// ---------------------------------------------------------------------------
type MockProfile = 'happyPath' | 'empty' | 'error' | 'slow';

/** Expressão de binding. Placeholder "{{ chave }}"; o engine real usa uma AST segura (sem eval). */
type Expr = string;

interface TriggerDef {
  kind: 'http';
  method: 'GET' | 'POST';
  path: string;
}

/** O vocabulário de operadores exercitado por este spike (subconjunto). */
type StepDef =
  | { op: 'validate'; require: string[] }
  | { op: 'call-integration'; integration: string; operation: string; as: string };

interface FlowDefinition {
  id: string;
  trigger: TriggerDef;
  /** De onde vem o input. GetBalance: customerId vem do executionContext, nunca do cliente. */
  input: { from: 'executionContext'; pick: string[] };
  steps: StepDef[];
  /** Qual chave do contexto vira o corpo da resposta. */
  output: Expr;
}

// ---------------------------------------------------------------------------
// 2) A CONFIG DO GetBalance — escrita à mão, como dado puro (seria uma linha em
//    config_version.body no Supabase). NENHUMA palavra "balance" no engine abaixo.
// ---------------------------------------------------------------------------
const getBalanceFlow: FlowDefinition = {
  id: 'get-balance',
  trigger: { kind: 'http', method: 'GET', path: '/api/balance' },
  input: { from: 'executionContext', pick: ['customerId'] },
  steps: [
    { op: 'validate', require: ['customerId'] },
    { op: 'call-integration', integration: 'core', operation: 'getBalance', as: 'balance' },
  ],
  output: '{{ balance }}',
};

// ---------------------------------------------------------------------------
// 3) RUNTIME DE INTEGRAÇÃO (mock) — fiel a withProfile.ts + fixtures/balance.ts.
//    No engine real isto é um conector REST/Mock genérico dirigido por config.
// ---------------------------------------------------------------------------
class MockGatewayError extends Error {
  operation?: string;
  constructor(operation?: string) {
    super(`mock gateway error in ${operation ?? 'operation'}`);
    this.operation = operation;
  }
}

const SLOW_PROFILE_DELAY_MS = 0; // o repo usa 3000; aqui 0 para o spike não esperar
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ProfileFixtures {
  happyPath: () => unknown;
  empty?: () => unknown;
  operation: string;
}

async function withProfile(profile: MockProfile | undefined, fns: ProfileFixtures): Promise<unknown> {
  switch (profile) {
    case 'error':
      throw new MockGatewayError(fns.operation);
    case 'slow':
      await delay(SLOW_PROFILE_DELAY_MS);
      return fns.happyPath();
    case 'empty':
      return fns.empty ? fns.empty() : fns.happyPath();
    default:
      return fns.happyPath();
  }
}

/** Registry de integrações — declarativo. Reproduz os fixtures reais de balance. */
const integrations: Record<string, Record<string, Omit<ProfileFixtures, 'operation'>>> = {
  core: {
    getBalance: {
      happyPath: () => ({ netWorth: 12_500_000, available: 1_250_000, invested: 11_250_000, currency: 'BRL' }),
      empty: () => ({ netWorth: 0, available: 0, invested: 0, currency: 'BRL' }),
    },
  },
};

// ---------------------------------------------------------------------------
// 4) O INTERPRETADOR — genérico. Não sabe o que é "balance". Só lê a config.
// ---------------------------------------------------------------------------
class ValidationError extends Error {
  missing: string[];
  constructor(missing: string[]) {
    super(`validation_failed: ${missing.join(', ')}`);
    this.missing = missing;
  }
}

type Ctx = Record<string, unknown>;
type HttpResult = { status: number; body: unknown };

/** Resolve "{{ chave.aninhada }}" lendo do contexto. (No engine real: AST segura.) */
function resolveExpr(expr: Expr, ctx: Ctx): unknown {
  const m = expr.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
  if (!m) return expr;
  return m[1].split('.').reduce<unknown>((acc, key) => (acc as Ctx)?.[key], ctx);
}

async function runFlow(
  flow: FlowDefinition,
  req: { profile: MockProfile | undefined; executionContext: Record<string, unknown> },
): Promise<HttpResult> {
  try {
    // input: pega do executionContext só os campos declarados
    const ctx: Ctx = {};
    for (const field of flow.input.pick) ctx[field] = req.executionContext[field];

    for (const step of flow.steps) {
      switch (step.op) {
        case 'validate': {
          const missing = step.require.filter((f) => ctx[f] == null || ctx[f] === '');
          if (missing.length) throw new ValidationError(missing);
          break;
        }
        case 'call-integration': {
          const op = integrations[step.integration]?.[step.operation];
          if (!op) throw new Error(`unknown integration op: ${step.integration}.${step.operation}`);
          ctx[step.as] = await withProfile(req.profile, { ...op, operation: step.operation });
          break;
        }
      }
    }

    return { status: 200, body: resolveExpr(flow.output, ctx) };
  } catch (err) {
    // mapeamento de erro → HTTP (no engine real: hook onError + tabela do CLAUDE.md)
    if (err instanceof ValidationError) return { status: 400, body: { error: 'validation_error', fields: err.missing } };
    if (err instanceof MockGatewayError) return { status: 500, body: { error: 'mock_gateway_error' } };
    return { status: 500, body: { error: 'internal_error' } };
  }
}

// ---------------------------------------------------------------------------
// 5) ORÁCULO DE PARIDADE — o comportamento esperado vem da implementação real
//    de hoje (fixtures + controller + tabela de erros). Verde = config reproduz.
// ---------------------------------------------------------------------------
const happy = { netWorth: 12_500_000, available: 1_250_000, invested: 11_250_000, currency: 'BRL' };
const empty = { netWorth: 0, available: 0, invested: 0, currency: 'BRL' };

const cases: Array<{
  name: string;
  profile: MockProfile | undefined;
  ctx: Record<string, unknown>;
  expect: HttpResult;
}> = [
  { name: 'happyPath',           profile: 'happyPath', ctx: { customerId: 'cus_1' }, expect: { status: 200, body: happy } },
  { name: 'empty',               profile: 'empty',     ctx: { customerId: 'cus_1' }, expect: { status: 200, body: empty } },
  { name: 'error -> 500',        profile: 'error',     ctx: { customerId: 'cus_1' }, expect: { status: 500, body: { error: 'mock_gateway_error' } } },
  { name: 'slow -> happyPath',   profile: 'slow',      ctx: { customerId: 'cus_1' }, expect: { status: 200, body: happy } },
  { name: 'sem customerId -> 400', profile: 'happyPath', ctx: {},                    expect: { status: 400, body: { error: 'validation_error', fields: ['customerId'] } } },
];

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const run = async () => {
  console.log('SPIKE GetBalance como FlowDefinition — paridade vs. implementação real\n');
  let failures = 0;
  for (const c of cases) {
    const got = await runFlow(getBalanceFlow, { profile: c.profile, executionContext: c.ctx });
    const ok = eq(got, c.expect);
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(22)}  status=${got.status}  body=${JSON.stringify(got.body)}`);
    if (!ok) console.log(`        esperado: status=${c.expect.status} body=${JSON.stringify(c.expect.body)}`);
  }
  console.log(`\n${failures === 0 ? 'TODOS VERDES' : failures + ' FALHA(S)'} — ${cases.length} casos`);
  process.exit(failures === 0 ? 0 : 1);
};

run();
