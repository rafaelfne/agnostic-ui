/**
 * Os controllers do vertical viraram **config** (Fase C, ADR 0002 §8): a rota
 * catch-all roda os flows pelo engine. Os schemas Zod (cada `schemas.ts`) ficam,
 * registrados em `interface/http/engineSchemas` para o operador `validate`.
 */
export {};
