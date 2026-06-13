import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';

export interface FlowCache {
  get(key: string): FlowDefinitionInput | undefined;
  set(key: string, value: FlowDefinitionInput): void;
}

/**
 * In-memory TTL cache for published flows (ADR 0002 §4.1 — reaproveita o Upstash
 * depois). The clock is injectable so expiry is testable.
 */
export class TtlFlowCache implements FlowCache {
  private readonly entries = new Map<string, { value: FlowDefinitionInput; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): FlowDefinitionInput | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    if (this.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: FlowDefinitionInput): void {
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }
}
