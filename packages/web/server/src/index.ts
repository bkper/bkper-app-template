import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import type { Env } from '../../../../env.js';

const app = new Hono<{ Bindings: Env }>();

app.use(logger());
app.use(prettyJSON());

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// === API routes ===
// Add your API routes here under /api/*
// Example: app.get('/api/data', (c) => c.json({ data: 'example' }));

// === Test endpoints for CLI integration tests ===

// Read from KV
app.get('/test/kv/:key', async (c) => {
  const key = c.req.param('key');
  const value = await c.env.KV.get(key);
  return c.json({ key, value, found: value !== null });
});

export default app;
