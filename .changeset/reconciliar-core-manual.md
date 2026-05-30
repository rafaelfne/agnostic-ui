---
'@yukilabs/agnostic-ui-core': patch
---

reconciliar marker, ExecutionContext e TenantConfig ao manual técnico

- **marker**: `SANDBOX_MARKER_RE` passa a exigir tenant `[a-z0-9-]{1,32}` (hífen,
  1–32 chars, **sem** underscore).
- **ExecutionContext**: renomeia `subject`→`customerId` e `profile`→`mockProfile`;
  o contexto sandbox passa a carregar `customerId`.
- **TenantConfigSchema**: `theme`/`layout`/`security`/`features` no shape do
  descritor do manual §3.1 (`primaryColor`, `corsOrigins`/`ipAllowlist`/`requireAuth`, etc.).
