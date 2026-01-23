import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { Bkper, Book } from 'bkper-js';
import { handleTransactionChecked } from './handlers/transaction-checked.js';
import type { EventResult } from '@my-app/shared';

type Env = {
  BKPER_API_KEY?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use(logger());
app.use(prettyJSON());

// Health check
app.get('/', (c) => c.json({ status: 'ok' }));

// Events webhook endpoint
app.post('/events', async (c) => {
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

export default app;
