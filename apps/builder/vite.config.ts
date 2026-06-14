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
    proxy: { '/api': 'http://localhost:3000' },
  },
});
