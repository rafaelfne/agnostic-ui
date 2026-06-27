import type { ILlm, LlmRequest, LlmResult } from '../../application/ports';

/**
 * `ILlm` determinístico para testes: devolve o resultado de uma função do request,
 * sem rede. É o seam que mantém a pipeline da IA (Frente I) testável e sem
 * não-determinância — espelha o stub de `IAuthz` em `builder.route.test`.
 */
export class FakeLlm implements ILlm {
  constructor(private readonly responder: (request: LlmRequest) => LlmResult) {}

  generate(request: LlmRequest): Promise<LlmResult> {
    return Promise.resolve(this.responder(request));
  }
}
