import { createRoute } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { openApiDocumentConfig } from './openapi.js';
import {
    apiErrorResponses,
    BookBalancesResponseSchema,
    BookIdParamSchema,
    jsonResponse,
    PingResponseSchema,
} from './schemas.js';
import { buildApiError } from './errors.js';
import { getBookBalances } from '../services/book-service.js';
import type { AppEnv } from '../app-context.js';

type App = OpenAPIHono<AppEnv>;

const pingRoute = createRoute({
    method: 'get',
    path: '/api/v1/ping',
    tags: ['API'],
    summary: 'Ping app API',
    responses: {
        200: jsonResponse('API is reachable', PingResponseSchema),
    },
});

const bookBalancesRoute = createRoute({
    method: 'get',
    path: '/api/v1/books/{bookId}/balances',
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
