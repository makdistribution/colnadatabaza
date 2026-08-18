/**
 * Local development server used by `npm run dev` / Cursor Run.
 * Serves the Vite frontend AND the existing Vercel API routes under /api/*
 * without changing production or auth logic.
 */
import http from 'node:http';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import type { ApiRequest, ApiResponse } from '../src/server/apiUtils.js';
import sessionHandler from '../api/session.js';
import appHandler from '../api/app.js';
import invoiceHandler from '../api/invoice.js';
import tariffHandler from '../api/tariff.js';

const preferredPort = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

type ExpressHandler = (
  request: express.Request,
  response: express.Response,
) => void | Promise<void>;

const asApiHandler =
  (handler: (request: ApiRequest, response: ApiResponse) => void | Promise<void>): ExpressHandler =>
  async (request, response) => {
    const apiRequest = request as unknown as ApiRequest;
    apiRequest.query = request.query as ApiRequest['query'];
    await handler(apiRequest, response as unknown as ApiResponse);
  };

const listenOnAvailablePort = (
  server: http.Server,
  host: string,
  startPort: number,
  maxAttempts = 20,
): Promise<number> =>
  new Promise((resolve, reject) => {
    let port = startPort;

    const tryListen = () => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.off('listening', onListening);
        if (error.code === 'EADDRINUSE' && port < startPort + maxAttempts - 1) {
          port += 1;
          tryListen();
          return;
        }
        reject(error);
      };

      const onListening = () => {
        server.off('error', onError);
        resolve(port);
      };

      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, host);
    };

    tryListen();
  });

async function start() {
  const app = express();
  // Match typical Vercel body size; handlers also accept pre-parsed body via readJsonBody.
  app.use(express.json({ limit: '2mb' }));

  // Mount existing serverless handlers BEFORE Vite so /api/* is never treated as source.
  app.all('/api/session', asApiHandler(sessionHandler));
  app.all('/api/app', asApiHandler(appHandler));
  app.all('/api/invoice', asApiHandler(invoiceHandler));
  app.all('/api/tariff', asApiHandler(tariffHandler));

  const server = http.createServer(app);

  const vite = await createViteServer({
    configFile: 'vite.config.ts',
    server: {
      middlewareMode: true,
      hmr: { server },
      host: HOST,
    },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  const port = await listenOnAvailablePort(server, HOST, preferredPort);
  console.log(`Local app + API ready at http://localhost:${port}/`);
  console.log('API routes: /api/session, /api/app, /api/invoice, /api/tariff');
}

start().catch((error) => {
  console.error('Failed to start local development server:', error);
  process.exit(1);
});
