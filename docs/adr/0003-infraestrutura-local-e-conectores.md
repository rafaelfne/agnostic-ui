# ADR 0003 — Infraestrutura do sistema: ambiente local (Supabase) e conectores seguros

- **Status:** Aceito (implementação em andamento — ambiente local primeiro; conectores depois)
- **Data:** 2026-06-13
- **Contexto da fase:** Fase B do meta-engine — fecha a infra que falta para o
  config store rodar de ponta a ponta e abre a fronteira de egress (conectores)
- **Camada afetada:** raiz do monorepo (toolchain/devex), `@yukilabs/agnostic-ui-next`
  (host do runtime, conectores em `infra`), config store (Supabase/Postgres)
- **Relacionado:** estende o [ADR 0002](0002-meta-engine-config-runtime.md) (§4 store,
  §7 segurança) e o [ADR 0001](0001-bff-hardening-jwt-rate-limit.md) (JWT/rate-limit);
  plano em [`docs/plano-meta-engine.md`](../plano-meta-engine.md)

## Contexto

A Fase B já entregou o engine hospedado no `next` e o config store (Drizzle/Postgres,
RLS, publish fail-closed), testado in-process com pglite. Faltam **duas coisas de
infraestrutura** para o sistema rodar como a proposta pede:

1. **Um ambiente local de um comando.** Hoje não há como subir o stack real
   (Postgres + RLS como role de app + os extras do Supabase) localmente sem passos
   manuais. Sem isso, o loop runtime→store publicado não roda fora dos testes, e o
   self-host first-class do ADR 0002 §7 fica só no papel.
2. **Conectores genéricos seguros.** O `call-integration` hoje fala só com o
   `ICoreGateway` (mock/http hardcoded) via a port `IIntegrationRunner`. Para o
   vertical virar config de verdade, o engine precisa de conectores **REST/GraphQL
   dirigidos por `IntegrationDefinition`** — e tirar URLs/credenciais para uma UI
   (com público não-dev e repo público) **aumenta a superfície de ataque** (ADR
   0002 §7). Egress arbitrário a partir de config é SSRF por construção se não for
   contido.

Ambas mexem em infra e na fronteira de segurança — daí esta ADR. As decisões abaixo
foram fechadas com o time.

## Decisão

### 1. Supabase local como stack de desenvolvimento

O ambiente local é o **Supabase rodando via CLI** (`supabase start`): Postgres +
Auth + Studio + Realtime + Vault em Docker. É coerente com a escolha do ADR 0002
(Supabase OSS, self-host first-class) e já habilita Auth/Vault/Realtime que o
builder usará. Por baixo é Postgres puro atrás da port `IConfigStore` — quem não
quiser Supabase sobe Postgres pelado e aponta `DATABASE_URL`, sem o engine perceber.

### 2. `pnpm setup:local` — ambiente pronto em um comando

Um script idempotente na raiz que deixa o ambiente **pronto para uso**:

1. **Pré-flight:** verifica Docker em execução e a CLI do Supabase; falha com
   instrução clara se faltar (não tenta instalar nada sem permissão).
2. `supabase start` (na primeira vez baixa as imagens — pode demorar).
3. Aplica as **migrations** de `packages/next/drizzle/*.sql` no Postgres local, na
   ordem (schema + RLS).
4. Cria/atualiza **`.env.local`** a partir do `supabase status` (URL do DB, chaves
   `anon`/`service_role`, URL da API), sem sobrescrever segredos já presentes.
5. **Seed:** publica um flow de referência (`get-balance`) no store via
   `publishFlowVersion` (fail-closed), provando o caminho draft→publish.

`pnpm reset:local` (teardown) roda `supabase stop` + `supabase db reset`. O comando é
seguro de rodar repetidas vezes.

### 3. Modelo de env e segredos

- **`.env.local` é gerado e fica fora do git** (gitignored); **`.env.example`** é
  versionado e documenta o shape (DB, chaves Supabase, JWT do ADR 0001, Upstash
  opcional, allowlist).
- **Nenhum segredo no repo nem no config store.** A config referencia segredos por
  nome (`secretRef`), nunca o valor — estende o guardrail "nunca persistir segredo
  no config store" (ADR 0002 §7).
- **Role de app não-superuser.** A aplicação conecta como uma role comum (não
  `postgres`), porque **superuser ignora RLS**. As migrations criam/usam essa role;
  a RLS por `tenant_id` (ADR 0002) só vale assim.

### 4. Conectores genéricos atrás de `IIntegrationRunner`

A versão de produção do runner: `RestIntegrationRunner` e `GraphqlIntegrationRunner`
**dirigidos pela `IntegrationDefinition`** (schema já existe no engine, §FA.4). Eles
implementam a mesma port `IIntegrationRunner` que o `EngineCoreIntegrationRunner` e o
mock — o engine continua agnóstico. Um registry escolhe o runner por
`integration.kind` (`rest`/`graphql`/`mock`). A **fronteira Mock↔Core** segue
preservada por requisição (um runner por execução).

### 5. Allowlist de egress + anti-SSRF (fail-closed)

Toda chamada de saída passa por um guardião antes de sair:

- **Allowlist por tenant** (referenciada em `integration.security.allowlistRef`,
  resolvida do store/config): só hosts liberados. Host fora da lista → **rejeita,
  não chama**.
- **Anti-SSRF:** resolve o DNS e **bloqueia IPs privados/reservados** (RFC1918,
  loopback `127.0.0.0/8`/`::1`, link-local `169.254.0.0/16` incl. o metadata
  `169.254.169.254`, ULA `fc00::/7`); **re-checa após redirect** (sem seguir
  redirect para host fora da allowlist) e contra **DNS rebinding** (valida o IP
  efetivamente conectado).
- **Esquema:** `https` por padrão (`http` só com opt-in explícito por integração,
  ex. mock local).
- **Limites:** `timeoutMs` e `retries` da `IntegrationDefinition.security` são
  obrigatórios e limitados; sem corpo/resposta acima de um teto.

### 6. Secret-ref via `ISecretResolver` (Vault/env), fail-closed

A `IntegrationDefinition.auth.secretRef` é resolvida em runtime por uma port
**`ISecretResolver`**: **Supabase Vault** em produção, **env** em local/self-host,
atrás da port (opt-in, como no ADR 0002 §4). Segredo não resolvido → **rejeita a
chamada** (fail-closed). O valor nunca entra em log nem no config store.

### 7. Seed reaproveita o vertical financeiro e os perfis de mock

O seed publica o `get-balance` como `FlowDefinition` e (quando os conectores REST
existirem) uma `IntegrationDefinition` `kind: mock` apontando para os fixtures. Os
markers de sandbox + perfis (`happyPath`/`empty`/`error`/`slow`) alimentam o
"simular" de graça (ADR 0002, plano §5).

## Consequências

- **Dependência de dev:** Docker + CLI do Supabase para o ambiente local. O primeiro
  `setup:local` baixa imagens (lento); rodadas seguintes são rápidas. O CI continua
  sem Docker (pglite cobre o store).
- **Novas ports/infra (implementação a seguir):** `ISecretResolver`, o guardião de
  egress (allowlist/anti-SSRF) e os runners `rest`/`graphql`. Cada um com testes.
- **Nova decisão de segurança registrada** (atende o guardrail "não alterar a camada
  de segurança sem ADR"). A implementação dos conectores entra como feature própria.
- **Runtime lê o flow publicado do store** (FB.3, próximo): a rota `/api/engine/[flow]`
  passa a carregar a versão publicada (cache LRU/Upstash do ADR 0001), com fallback
  ao registry in-code quando não há store configurado.
- **`.env.example` versionado**; `.env.local` e `supabase/.temp` no `.gitignore`.

## Alternativas consideradas

- **Postgres via docker-compose (sem Supabase):** mais leve, mas perde Auth/Vault/
  Studio/Realtime e diverge da escolha do ADR 0002; reabriria a discussão de store.
  Rejeitado — o Supabase local é a fonte fiel do ambiente de produção.
- **pglite como ambiente local:** ótimo para testes/CI (já em uso), mas não exercita
  RLS como role de app, nem os extras do Supabase, nem egress real. Rejeitado como
  ambiente de dev (mantido para testes).
- **Sem allowlist (confiar na config):** rejeitado — SSRF direto a partir de uma UI
  de não-devs num repo público. A allowlist + anti-SSRF é não-negociável.
- **Segredo inline na config:** rejeitado pelo guardrail; daí o `secretRef` +
  `ISecretResolver`.
- **Instalar/gerir Postgres na máquina (sem container):** rejeitado — frágil e não
  reprodutível; o objetivo é "um comando, ambiente idêntico para todos".
