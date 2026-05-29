import { OpenAPIHono } from '@hono/zod-openapi';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { buildApiError } from './api/errors.js';
import { registerApiRoutes } from './api/routes.js';
import { registerEventRoutes } from './events/routes.js';
import type { Env } from '../../env.js';

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

registerApiRoutes(app);
registerEventRoutes(app);

app.get('*', c => c.env.ASSETS.fetch(c.req.raw));

export default app;
export { buildApiError };
