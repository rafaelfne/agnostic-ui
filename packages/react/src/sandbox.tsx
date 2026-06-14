import type { MockProfile } from '@yukilabs/agnostic-ui-core';
import { type ReactNode, createContext, useContext } from 'react';

export interface SandboxValue {
  /** Whether the experience runs against mock data. */
  enabled: boolean;
  /** The mock profile in effect (drives the "simular" preview). */
  profile?: MockProfile;
  tenantId?: string;
}

const SandboxContext = createContext<SandboxValue>({ enabled: false });

export function useSandbox(): SandboxValue {
  return useContext(SandboxContext);
}

export interface SandboxProviderProps {
  value: SandboxValue;
  children?: ReactNode;
}

/** Provides the sandbox state (profile/tenant) to the tree — the builder's preview reads it. */
export function SandboxProvider({ value, children }: SandboxProviderProps): ReactNode {
  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
}
