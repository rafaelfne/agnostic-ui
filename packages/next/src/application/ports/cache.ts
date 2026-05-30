/**
 * Port: key/value cache with TTL and batch operations (manual, Parte 2.3.1).
 */
export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  getMany<T>(keys: readonly string[]): Promise<(T | null)[]>;
}
