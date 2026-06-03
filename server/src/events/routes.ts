import type { OpenAPIHono } from '@hono/zod-openapi';
import { Book } from 'bkper-js';
import { handleTransactionChecked } from './handlers/transaction-checked.js';
import type { EventResult } from './types.js';
import type { AppEnv } from '../app-context.js';

type App = OpenAPIHono<AppEnv>;

export function registerEventRoutes(app: App): void {
    app.post('/events', async c => {
        try {
            const event: bkper.Event = await c.req.json();

            if (!event.book) {
                return c.json({ error: 'Missing book in event payload' }, 400);
            }

            const context = c.get('appContext');
            const book = new Book(event.book, context.bkper.getConfig());
            const result = await dispatchEvent(book, event);

            return c.json(result);
        } catch (err: unknown) {
            console.error(err);
            const error = err instanceof Error ? err.message : 'Unknown error';
            return c.json({ error });
        }
    });
}

async function dispatchEvent(book: Book, event: bkper.Event): Promise<EventResult> {
    switch (event.type) {
        case 'TRANSACTION_CHECKED':
            return handleTransactionChecked(book, event);
        default:
            return { result: false };
    }
}
