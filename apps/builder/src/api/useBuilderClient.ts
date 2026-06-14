import { useMemo } from 'react';

import { useAuth } from '../auth/AuthContext';
import { readEnv } from '../env';

import { type BuilderApiClient, createBuilderClient } from './client';

/** A memoized builder API client bound to the current session token. */
export function useBuilderClient(): BuilderApiClient {
  const { token } = useAuth();
  return useMemo(
    () => createBuilderClient({ baseUrl: readEnv().apiBase, getToken: () => token }),
    [token],
  );
}
