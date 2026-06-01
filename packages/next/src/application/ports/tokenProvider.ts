/**
 * Port: provides a JWT for service-to-service calls, with caching and proactive
 * renewal (manual, Parte 2.3.1). The renewal/cache strategy is an infra concern.
 */
export interface ITokenProvider {
  getToken(): Promise<string>;
}
