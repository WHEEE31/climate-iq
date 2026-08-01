import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * One config, no environment branching.
 *
 * In development, Vite runs in middleware mode inside the Express server
 * (see server/index.ts), so there is no separate dev server, no proxy target,
 * and no port to keep in sync. In production, this config only builds static
 * assets into dist/client, which Express then serves.
 */
export default defineConfig({
  root,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
      '@shared': path.resolve(root, 'shared'),
    },
  },
  build: {
    outDir: path.resolve(root, 'dist/client'),
    emptyOutDir: true,
    sourcemap: true,
  },
});
