import type { MockProfile } from '../sandbox/profile';

/** Whether a request is served with mock data (sandbox) or the real Core (live). */
export type ExecutionMode = 'sandbox' | 'live';

export interface SandboxExecutionContext {
  mode: 'sandbox';
  tenantId: string;
  profile: MockProfile;
}

export interface LiveExecutionContext {
  mode: 'live';
  tenantId: string;
  subject: string;
}

export type ExecutionContext = SandboxExecutionContext | LiveExecutionContext;
