import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import menu from './routes/menu.js';

type Env = {
  BKPER_API_KEY?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use(logger());
app.use(prettyJSON());

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Menu routes
app.route('/menu', menu);

export default app;
