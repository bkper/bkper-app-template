import { createRoute } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { openApiDocumentConfig } from './openapi.js';
import {
    apiErrorResponses,
    BookBalancesResponseSchema,
    BookIdParamSchema,
    BooksResponseSchema,
    PingResponseSchema,
} from './schemas.js';
import { buildApiError } from './errors.js';
import { getBookBalances, listBooks } from '../services/book-service.js';
import type { Env } from '../../../env.js';

type App = OpenAPIHono<{ Bindings: Env }>;

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

export function registerApiRoutes(app: App): void {
    app.openapi(pingRoute, c => c.json({ ok: true, source: 'my-app' }, 200));

    app.openapi(booksRoute, async c => c.json({ books: await listBooks() }, 200));

    app.openapi(bookBalancesRoute, async c => {
        const { bookId } = c.req.valid('param');
        return c.json(await getBookBalances(bookId), 200);
    });

    app.doc('/openapi.json', openApiDocumentConfig);

    app.all('/api/*', c =>
        c.json(buildApiError('NOT_FOUND', `Route not found: ${c.req.method} ${c.req.path}`), 404)
    );
}
