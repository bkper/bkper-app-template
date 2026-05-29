import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { Bkper, Book } from 'bkper-js';
import { handleTransactionChecked } from './handlers/transaction-checked.js';
import { openApiDocumentConfig } from './api/openapi.js';
import {
    apiErrorResponses,
    BookBalancesResponseSchema,
    BookIdParamSchema,
    BooksResponseSchema,
    PingResponseSchema,
} from './api/schemas.js';
import type { EventResult } from './types.js';
import type { Env } from '../../env.js';

type ApiErrorCode = string;

function buildApiError(code: ApiErrorCode, message: string) {
    return {
        success: false as const,
        error: { code, message },
    };
}

const app = new OpenAPIHono<{ Bindings: Env }>({
    defaultHook: (result, c) => {
        if (!result.success) {
            const message = result.error.issues[0]?.message ?? 'Invalid request';
            return c.json(buildApiError('INVALID_REQUEST', message), 400);
        }
    },
});

app.use(logger());
app.use(prettyJSON());

app.onError((err, c) => {
    console.error(err);
    if (c.req.path.startsWith('/api/')) {
        return c.json(buildApiError('INTERNAL_ERROR', err.message), 500);
    }
    return c.json({ error: err.message }, 500);
});

app.get('/health', c => c.json({ status: 'ok' }));

const pingRoute = createRoute({
    method: 'get',
    path: '/api/ping',
    tags: ['API'],
    summary: 'Ping app API',
    responses: {
        200: {
            description: 'API is reachable',
            content: { 'application/json': { schema: PingResponseSchema } },
        },
    },
});

app.openapi(pingRoute, c => c.json({ ok: true, source: 'my-app' }, 200));

const booksRoute = createRoute({
    method: 'get',
    path: '/api/books',
    tags: ['API'],
    summary: 'List accessible books',
    description: 'Returns the books visible to the authenticated user.',
    responses: {
        200: {
            description: 'Accessible books',
            content: { 'application/json': { schema: BooksResponseSchema } },
        },
        ...apiErrorResponses,
    },
});

app.openapi(booksRoute, async c => {
    const bkper = new Bkper();
    const books = await bkper.getBooks();
    return c.json(
        {
            books: books
                .map(book => ({
                    id: book.getId(),
                    name: book.getName() ?? 'Untitled book',
                }))
                .filter((book): book is { id: string; name: string } => Boolean(book.id)),
        },
        200
    );
});

const bookBalancesRoute = createRoute({
    method: 'get',
    path: '/api/books/{bookId}/balances',
    tags: ['API'],
    summary: 'Get book account balances',
    request: {
        params: BookIdParamSchema,
    },
    responses: {
        200: {
            description: 'Book account balances',
            content: { 'application/json': { schema: BookBalancesResponseSchema } },
        },
        ...apiErrorResponses,
    },
});

app.openapi(bookBalancesRoute, async c => {
    const { bookId } = c.req.valid('param');
    const bkper = new Bkper();
    const book = await bkper.getBook(bookId);
    const report = await book.getBalancesReport('');

    return c.json(
        {
            book: {
                id: book.getId(),
                name: book.getName() ?? 'Untitled book',
            },
            balances: report.getBalancesContainers().map(container => ({
                name: container.getName(),
                cumulativeBalanceText: container.getCumulativeBalanceText(),
            })),
        },
        200
    );
});

app.doc('/openapi.json', openApiDocumentConfig);

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

app.all('/api/*', c =>
    c.json(buildApiError('NOT_FOUND', `Route not found: ${c.req.method} ${c.req.path}`), 404)
);

app.get('*', c => c.env.ASSETS.fetch(c.req.raw));

export default app;
export { buildApiError };
