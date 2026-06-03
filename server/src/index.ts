import { OpenAPIHono } from '@hono/zod-openapi';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { buildApiError } from './api/errors.js';
import { registerApiRoutes } from './api/routes.js';
import { registerEventRoutes } from './events/routes.js';
import {
    appContextMiddleware,
    createAppContext,
    type AppContextFactory,
    type AppEnv,
} from './app-context.js';

export function createApp(createContext: AppContextFactory = createAppContext) {
    const app = new OpenAPIHono<AppEnv>({
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

    app.use('/api/*', appContextMiddleware(createContext));
    app.use('/events', appContextMiddleware(createContext));

    registerApiRoutes(app);
    registerEventRoutes(app);

    app.get('*', c => c.env.ASSETS.fetch(c.req.raw));

    return app;
}

const app = createApp();

export default app;
export { buildApiError };
