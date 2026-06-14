# @yukilabs/agnostic-ui-builder

SPA no-code do Agnostic UI (Fase E, [ADR 0004](../../docs/adr/0004-builder-no-code.md)).
Edita flows, telas SDUI e integrações sobre a **API do builder** do BFF
(`/api/builder/*`, entregue na onda E.1), com login via Supabase Auth e preview
ao vivo (FlowEngine client do pacote `react`).

> Cliente puro (Vite + React). RLS, segredos e validação de publish ficam no
> servidor — o SPA só fala com a API por sessão autenticada.

## Desenvolvimento

```bash
pnpm --filter @yukilabs/agnostic-ui-builder dev   # Vite em :5173, /api → BFF :3000
```

Suba o BFF (`pnpm --filter @yukilabs/agnostic-ui-next dev`) e o Supabase local
(`pnpm setup:local`) em paralelo. Variáveis em `.env.local` (veja `.env.example`):

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — login (Supabase Auth/GoTrue).
- `VITE_API_BASE` — base da API do builder (vazio = mesma origem, via proxy).

## Scripts

`dev` · `build` · `preview` · `test` · `typecheck` · `lint`.
