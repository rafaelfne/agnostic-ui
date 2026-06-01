# ADR 0001 — Hardening do BFF: verificação de assinatura JWT + rate limit

- **Status:** Aceito
- **Data:** 2026-06-01
- **Contexto da fase:** F6 (hardening) — issues #38/#39/#40
- **Camada afetada:** segurança (`packages/next/src/infra/auth`)

## Contexto

Até aqui o `@yukilabs/agnostic-ui-core` apenas **decodifica** o payload do JWT
(base64url, sem verificar assinatura) — uma decisão consciente para manter o
shared kernel puro, sem I/O nem dependência de ambiente. O CLAUDE.md sempre
sinalizou que **verificação de assinatura e rate limit eram hardening do BFF,
adiados para fases posteriores**.

Esta ADR registra a decisão de implementar esse hardening no BFF
(`@yukilabs/agnostic-ui-next`), já que mexer na camada de segurança exige
decisão arquitetural registrada (guardrail do CLAUDE.md).

## Decisão

### 1. A verificação de assinatura mora no BFF, não no core

O core continua só decodificando. A verificação acontece em
`infra/auth/verifyJwt.ts` usando a lib **`jose`**. Motivo: verificar assinatura
exige JWKS remoto ou segredo — ou seja, I/O e configuração de ambiente — que não
pertencem ao kernel puro. `resolveExecutionMode` passa a ser **async** porque a
verificação (jose) é async.

### 2. Fontes de chave resolvidas do ambiente, em tempo de chamada

`resolveVerificationKey(env)` escolhe, nesta ordem:

- `JWT_JWKS_URL` → **RS256/ES256** via JWKS remoto cacheado (`createRemoteJWKSet`).
- `JWT_HS256_SECRET` → **HS256** (segredo simétrico).
- nenhum → `null`.

A resolução é feita a cada chamada (não no boot) para que os testes troquem o
ambiente sem reiniciar módulos. `jwtVerify` também valida `exp`/`nbf`.

### 3. Verificação de JWT é **fail-closed**

Sem chave configurada (`null`), **todo JWT live é rejeitado** com
`JwtVerificationError('no_key_configured')`. Qualquer falha (assinatura inválida,
expirado, malformado, sem chave) vira `invalid_jwt` → **401**. **Nunca** há
fallback para decode não verificado. Autenticação não pode degradar
silenciosamente: melhor recusar do que aceitar um token não verificado.

> Sandbox não é afetado: markers `app_sandbox_*` tomam o ramo de sandbox **antes**
> de `verifyJwt` e não passam por verificação de assinatura.

### 4. Rate limit é **fail-open**

`infra/auth/rateLimit.ts` aplica uma **janela fixa por `subject`+`tenant`**
(chave `ratelimit:<tenant>:<subject>`, IP como fallback) no **Upstash Redis (REST)**.

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` → limite ativo.
- qualquer um ausente, **ou erro do store** → **no-op / libera a requisição**.
- Default: **120 req / 60 s**, configurável por `RATE_LIMIT_MAX` e
  `RATE_LIMIT_WINDOW_MS`.
- Estouro → **429** com `retry-after`, `x-ratelimit-limit`, `x-ratelimit-remaining`.

O contraste com o JWT é **deliberado**: rate limit é proteção de
**disponibilidade**, não de autorização. Um Redis fora do ar (ou não configurado)
não deve derrubar o BFF nem travar CI/dev — então **libera** em vez de retornar
5xx. É aplicado em `resolveRequestContext` depois do cross-check, para ambos os
modos (em sandbox/dev sem Upstash, é no-op).

## Consequências

- **Novas variáveis de ambiente:**
  - `JWT_JWKS_URL` **ou** `JWT_HS256_SECRET` — **obrigatório em produção** para
    o modo live; sem isso, todo JWT é recusado (fail-closed, intencional).
  - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — opcional; sem eles, o
    rate limit é no-op.
  - `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` — opcionais (defaults acima).
- **Novas dependências:** `jose`, `@upstash/redis`.
- **Novo código de erro HTTP:** `rate_limited` → **429** (soma-se à tabela do
  resolver).
- **CI/dev** rodam sem Redis e sem chave JWT (usam markers de sandbox).
- **Risco operacional aceito:** esquecer a chave JWT em produção quebra todo
  login live — preferível a aceitar tokens não verificados.

## Alternativas consideradas

- **Verificar o JWT no core:** rejeitado — quebraria a pureza do kernel
  (I/O + env). O core permanece decode-only.
- **Fail-open na verificação de JWT:** rejeitado — aceitaria tokens não
  verificados se a chave sumisse; risco de segurança inaceitável.
- **Rate limit in-memory:** rejeitado — o BFF é serverless/multi-instância; a
  contagem precisa ser compartilhada, daí um store externo (Upstash REST,
  serverless-friendly).
- **Sliding window / token bucket:** a janela fixa (`INCR` + `PEXPIRE`) é
  suficiente e barata; pode evoluir se necessário.
