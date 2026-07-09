# @yukilabs/agnostic-ui-e2e

E2E da **plataforma como um todo** (Playwright): exercita o loop config-driven ponta a
ponta — o **builder SPA** (:5173) autora/publica config sobre a **API do builder** do
BFF, e o **runtime** do BFF (engine) serve a config publicada; tudo contra o **Supabase
local** real (auth + store).

## Pré-requisitos

O stack local precisa estar de pé (Docker + Supabase CLI):

```bash
pnpm setup:local   # sobe Supabase (:554xx) + migrations + seed (ADR 0003)
```

A primeira vez, instale o browser do Playwright:

```bash
pnpm --filter @yukilabs/agnostic-ui-e2e install:browsers   # chromium
```

## Rodar

```bash
pnpm e2e            # sobe BFF+builder dedicados, roda a suíte, derruba
pnpm e2e:report    # abre o relatório HTML do último run
```

O `playwright.config.ts` sobe **servers dedicados** (não colidem com o dev):

- **BFF** em `:3100` (`next dev`), com o seam **`BUILDER_FAKE_LLM`** ligado (getLlm.ts) —
  a IA responde determinístico, sem rede nem chave.
- **builder** em `:5173` (`vite`), com `VITE_PROXY_TARGET=:3100` (o `/api` do SPA aponta
  no BFF dedicado).

O login do publisher roda uma vez (`auth.setup.ts`) e a sessão é reusada via
`storageState` (`.auth/`, gitignored).

## Jornadas cobertas

| Spec                       | Camada        | O que prova                                                                                                             |
| -------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `flow-publish.spec.ts`     | browser + API | publisher publica o `get-balance` pela UI → o runtime serve a versão publicada (o loop)                                 |
| `sandbox-profiles.spec.ts` | API (runtime) | marker `app_sandbox_<tenant>_<profile>` nos 4 perfis + `tenant_mismatch` (403) e marker inválido (400)                  |
| `authz.spec.ts`            | API (builder) | sem token → 401; editor não publica (403) mas publisher sim; isolamento por tenant (acme não vê artefatos do partnerco) |
| `screens-ai.spec.ts`       | browser + API | o editor de telas (épico K) lista/abre uma tela seedada; a IA propõe um rascunho válido e **nunca publica**             |

## Usuários do seed

Senha `builder-local-123` (de `pnpm setup:local`):

- `admin@partnerco.com` — partnerco · **publisher**
- `editor@partnerco.com` — partnerco · editor
- `admin@acme.com` — acme · publisher

## Notas

- Serial, 1 worker: o E2E bate num store compartilhado; determinismo > velocidade.
- Os testes de browser reusam a sessão do `storageState`; os de API pegam o token via
  GoTrue (`helpers/api.ts`).
- CI: o pacote **não** roda no `turbo run test`/`ci:local` (não tem script `test`, só
  `e2e`) — precisa do stack local, então roda à parte.
