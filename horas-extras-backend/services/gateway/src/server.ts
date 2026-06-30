import Fastify from 'fastify';
import proxy from '@fastify/http-proxy';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';

const app = Fastify({ logger: true });

app.register(cors, { origin: process.env.FRONT_ORIGIN ?? true, credentials: true });
app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

app.register(proxy, {
  upstream: process.env.AUTH_URL ?? 'http://auth-service:4001',
  prefix: '/api/auth',
  rewritePrefix: '/auth',
});

app.register(proxy, {
  upstream: process.env.OVERTIME_URL ?? 'http://overtime-service:4002',
  prefix: '/api/horas',
  rewritePrefix: '',
});

app.register(proxy, {
  upstream: process.env.REPORT_URL ?? 'http://report-service:4003',
  prefix: '/api/reportes',
  rewritePrefix: '/reportes',
});

app.get('/health', async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 4000);
app.listen({ port, host: '0.0.0.0' }).then(() => app.log.info(`gateway en :${port}`));
