import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import express from 'express';

import { apiRouter } from './routes';
import { logger } from './logger';

const here = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Bind to 0.0.0.0 rather than localhost. Container-based hosts (Render,
 * Railway, Fly, Docker) route traffic to the container's external interface,
 * so a server listening only on 127.0.0.1 accepts no outside connections —
 * the health check fails and the deploy is marked unhealthy.
 */
const HOST = process.env.HOST ?? '0.0.0.0';
const PORT = Number(process.env.PORT ?? 5000);

if (!Number.isInteger(PORT) || PORT <= 0 || PORT > 65535) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

async function main(): Promise<void> {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // Platform health probes hit the root path.
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', apiRouter);

  if (isProduction) {
    // Serve the compiled frontend from dist/client.
    const clientDir = path.resolve(here, '..', 'client');
    const indexHtml = path.join(clientDir, 'index.html');

    if (!fs.existsSync(indexHtml)) {
      throw new Error(
        `Frontend build not found at ${clientDir}. Run "npm run build" before "npm start".`,
      );
    }

    // Hashed asset filenames are safe to cache aggressively; index.html is not.
    app.use(
      express.static(clientDir, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );

    // SPA fallback: any non-API route renders the app shell.
    app.use((_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
  } else {
    /**
     * In development, run Vite in middleware mode inside this same process.
     * That gives one command, one port, and one URL for both the API and the
     * frontend — so there is no proxy to misconfigure and no CORS to debug.
     * Vite is a devDependency and is only imported on this branch, so it is
     * never required in production.
     */
    const { createServer } = await import('vite');
    const vite = await createServer({
      root: path.resolve(here, '..'),
      appType: 'spa',
      server: { middlewareMode: true },
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, HOST, () => {
    logger.info(
      { url: `http://localhost:${PORT}`, mode: isProduction ? 'production' : 'development' },
      'ClimateIQ is running',
    );
  });

  server.on('error', (err) => {
    logger.error({ err, port: PORT }, 'Failed to start server');
    process.exit(1);
  });

  // Containers send SIGTERM on shutdown; exit cleanly so deploys roll over fast.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      logger.info({ signal }, 'Shutting down');
      server.close(() => process.exit(0));
    });
  }
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
