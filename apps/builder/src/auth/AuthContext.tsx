import {
  type ReactElement,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { readEnv } from '../env';

import { type Session, signInWithPassword } from './gotrue';

const STORAGE_KEY = 'agnostic-builder-session';

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Session;
    return typeof parsed.accessToken === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export interface AuthValue {
  /** The current access token, or `null` when signed out. */
  token: string | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

/**
 * Holds the builder session (Supabase access token), persisted to localStorage so
 * a reload stays signed in. The token is attached as a Bearer header by the API
 * client; the BFF verifies and authorizes it.
 */
export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const env = useMemo(() => readEnv(), []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const next = await signInWithPassword(
        { url: env.supabaseUrl, anonKey: env.supabaseAnonKey },
        email,
        password,
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSession(next);
    },
    [env],
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ token: session?.accessToken ?? null, signIn, signOut }),
    [session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
