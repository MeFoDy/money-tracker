import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import multipart from '@fastify/multipart';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routes } from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

export async function buildApp() {
  const app = Fastify({ logger: true });

  // Security headers for every response
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    reply.header('Cross-Origin-Resource-Policy', 'same-origin');
    reply.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );
  });

  await app.register(cors, { origin: true });
  await app.register(multipart);
  await app.register(staticPlugin, {
    root: path.join(__dirname, 'public'),
    prefix: '/',
  });

  // Register all API routes under /api
  await app.register(routes, { prefix: '/api' });

  // SPA fallback
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      reply.code(404).send({ error: 'Not Found' });
      return;
    }
    return reply.sendFile('index.html');
  });

  return app;
}

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: '127.0.0.1' });
    app.log.info(`Server listening on http://127.0.0.1:${PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

import process from 'node:process';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  start();
}
