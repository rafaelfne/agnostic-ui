export interface BuilderEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** API origin prefix; empty = same origin (dev uses the Vite `/api` proxy). */
  apiBase: string;
}

/** Reads the build-time Vite env (`VITE_*`). The anon key is public by design. */
export function readEnv(): BuilderEnv {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    apiBase: import.meta.env.VITE_API_BASE ?? '',
  };
}
