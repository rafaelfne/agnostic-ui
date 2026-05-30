import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Monorepo: fixa a raiz do workspace (evita inferência ambígua com múltiplos lockfiles).
  turbopack: {
    root: resolve(rootDir, '../..'),
  },
};

export default nextConfig;
