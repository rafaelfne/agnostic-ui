/// <reference types="vitest" />
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Tailwind via the official Vite plugin (brief §3). The `/api` proxy and the
// `@` alias are the only additions over the original config — no behavior change.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    // Alvo do proxy /api → BFF. Default :3000 (dev padrão); override via
    // VITE_PROXY_TARGET p/ o E2E apontar num BFF dedicado sem colidir com o dev.
    proxy: { '/api': process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000' },
  },
});
