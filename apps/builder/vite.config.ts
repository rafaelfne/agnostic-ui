import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Builder SPA (ADR 0004 §1). In dev, `/api` proxies to the BFF (`next dev` on
 * :3000) so the SPA and the builder API share an origin (no CORS); in production
 * both are served behind the same origin.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
