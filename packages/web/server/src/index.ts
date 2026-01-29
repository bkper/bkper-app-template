import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

const app = new Hono<{ Bindings: Env }>();

app.use(logger());
app.use(prettyJSON());

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Root route is now served by Cloudflare Workers static assets (index.html)
// The server only handles API routes
// If you need server-side rendering, you can add logic here to detect
// API requests (Content-Type: application/json) vs browser requests

// === Test endpoints for CLI integration tests ===

// Read from KV
app.get('/test/kv/:key', async (c) => {
  const key = c.req.param('key');
  const value = await c.env.KV.get(key);
  return c.json({ key, value, found: value !== null });
});

export default app;
