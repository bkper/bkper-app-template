import { createRoute } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { openApiDocumentConfig } from './openapi.js';
import {
    apiErrorResponses,
    BookBalancesResponseSchema,
    BookIdParamSchema,
    BooksResponseSchema,
    jsonResponse,
    PingResponseSchema,
} from './schemas.js';
import { buildApiError } from './errors.js';
import { getBookBalances, listBooks } from '../services/book-service.js';
import type { AppEnv } from '../app-context.js';

type App = OpenAPIHono<AppEnv>;

const pingRoute = createRoute({
    method: 'get',
    path: '/api/ping',
    tags: ['API'],
    summary: 'Ping app API',
    responses: {
        200: jsonResponse('API is reachable', PingResponseSchema),
    },
});

const booksRoute = createRoute({
    method: 'get',
    path: '/api/books',
    tags: ['API'],
    summary: 'List accessible books',
    description: 'Returns the books visible to the authenticated user.',
    responses: {
        200: jsonResponse('Accessible books', BooksResponseSchema),
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
        200: jsonResponse('Book account balances', BookBalancesResponseSchema),
        ...apiErrorResponses,
    },
});

export function registerApiRoutes(app: App): void {
    app.openapi(pingRoute, c => c.json({ ok: true, source: 'my-app' }, 200));

    app.openapi(booksRoute, async c => {
        const context = c.get('appContext');
        return c.json({ books: await listBooks(context) }, 200);
    });

    app.openapi(bookBalancesRoute, async c => {
        const context = c.get('appContext');
        const { bookId } = c.req.valid('param');
        return c.json(await getBookBalances(context, bookId), 200);
    });

    app.doc('/openapi.json', openApiDocumentConfig);

    app.all('/api/*', c =>
        c.json(buildApiError('NOT_FOUND', `Route not found: ${c.req.method} ${c.req.path}`), 404)
    );
}
