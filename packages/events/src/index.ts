import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { Bkper, Book } from 'bkper-js';
import { handleTransactionChecked } from './handlers/transaction-checked.js';
import type { EventResult } from '@my-app/shared';

// Example KV cache usage (KV is auto-provisioned by Bkper Platform when services: [KV] is set in bkper.yaml)
// const cached = await c.env.KV.get('my-key');
// await c.env.KV.put('my-key', 'value', { expirationTtl: 3600 });

// Events worker is accessed at /events/* via dispatch, so use basePath
const app = new Hono<{ Bindings: Env }>().basePath('/events');

app.use(logger());
app.use(prettyJSON());

// Health check - accessible at /events
app.get('/', (c) => c.json({ status: 'ok' }));

// Events webhook endpoint - accessible at /events (POST)
app.post('/', async (c) => {
  try {
    const event: bkper.Event = await c.req.json();
    
    // Create Bkper client with request credentials
    const bkper = new Bkper({
      apiKeyProvider: c.env.BKPER_API_KEY 
        ? async () => c.env.BKPER_API_KEY! 
        : undefined,
      oauthTokenProvider: async () => c.req.header('bkper-oauth-token'),
      agentIdProvider: async () => c.req.header('bkper-agent-id'),
    });

    // Reconstruct book from event data
    const book = new Book(event.book, bkper.getConfig());
    
    let result: EventResult = { result: false };

    switch (event.type) {
      case 'TRANSACTION_CHECKED':
        result = await handleTransactionChecked(book, event);
        break;
      default:
        // Event type not handled
        result = { result: false };
    }

    return c.json(result);
  } catch (err: unknown) {
    console.error(err);
    const error = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error });
  }
});

// === Test endpoints for CLI integration tests ===

// Write to KV
app.post('/test/kv', async (c) => {
  const { key, value } = await c.req.json<{ key: string; value: string }>();
  await c.env.KV.put(key, value);
  return c.json({ success: true, key });
});

// Read from KV
app.get('/test/kv/:key', async (c) => {
  const key = c.req.param('key');
  const value = await c.env.KV.get(key);
  return c.json({ key, value, found: value !== null });
});

export default app;
