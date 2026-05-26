import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { Bkper } from 'bkper-js';
import type { Env } from '../../../../env.js';

const app = new Hono<{ Bindings: Env }>();

app.use(logger());
app.use(prettyJSON());

// Health check
app.get('/health', c => c.json({ status: 'ok' }));

// === API routes ===
// Server-side Bkper API calls use outbound auth injection:
// - Production: /api/* requests must include Authorization: Bearer <token>.
//   Dispatch validates the token, strips the header before invoking this Worker,
//   and platform outbound injects the authenticated user's token on Bkper API calls.
// - Local dev: `bkper app dev --web` injects your CLI auth token on Bkper API calls.
// Do not add custom OAuth routes or read tokens in app server code.
app.get('/api/books', async c => {
    const bkper = new Bkper();
    const books = await bkper.getBooks();
    return c.json({
        books: books
            .map(book => ({
                id: book.getId(),
                name: book.getName() ?? 'Untitled book',
            }))
            .filter((book): book is { id: string; name: string } => Boolean(book.id)),
    });
});

// === Test endpoints for CLI integration tests ===

// Read from KV
app.get('/test/kv/:key', async c => {
    const key = c.req.param('key');
    const value = await c.env.KV.get(key);
    return c.json({ key, value, found: value !== null });
});

export default app;
