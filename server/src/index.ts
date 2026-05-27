import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { Bkper, Book } from 'bkper-js';
import { handleTransactionChecked } from './handlers/transaction-checked.js';
import type { EventResult } from './types.js';
import type { Env } from '../../env.js';

const app = new Hono<{ Bindings: Env }>();

app.use(logger());
app.use(prettyJSON());

app.onError((err, c) => {
    console.error(err);
    return c.json({ error: err.message }, 500);
});

app.get('/health', c => c.json({ status: 'ok' }));

app.get('/api/ping', c => c.json({ ok: true, source: 'my-app' }));

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

app.get('/api/books/:bookId/balances', async c => {
    const bookId = c.req.param('bookId');
    const bkper = new Bkper();
    const book = await bkper.getBook(bookId);
    const report = await book.getBalancesReport('');

    return c.json({
        book: {
            id: book.getId(),
            name: book.getName() ?? 'Untitled book',
        },
        balances: report.getBalancesContainers().map(container => ({
            name: container.getName(),
            cumulativeBalanceText: container.getCumulativeBalanceText(),
        })),
    });
});

app.post('/events', async c => {
    try {
        const event: bkper.Event = await c.req.json();

        if (!event.book) {
            return c.json({ error: 'Missing book in event payload' }, 400);
        }

        const bkper = new Bkper();
        const book = new Book(event.book, bkper.getConfig());

        let result: EventResult = { result: false };
        switch (event.type) {
            case 'TRANSACTION_CHECKED':
                result = await handleTransactionChecked(book, event);
                break;
            default:
                result = { result: false };
        }

        return c.json(result);
    } catch (err: unknown) {
        console.error(err);
        const error = err instanceof Error ? err.message : 'Unknown error';
        return c.json({ error });
    }
});

app.get('/api/test/kv/:key', async c => {
    const key = c.req.param('key');
    const value = await c.env.KV.get(key);
    return c.json({ key, value, found: value !== null });
});

app.post('/api/test/kv', async c => {
    const { key, value } = await c.req.json<{ key: string; value: string }>();
    await c.env.KV.put(key, value);
    return c.json({ success: true, key });
});

app.all('/api/*', c => c.json({ error: 'Not found' }, 404));

app.get('*', c => c.env.ASSETS.fetch(c.req.raw));

export default app;
