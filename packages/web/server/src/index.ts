import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

type Env = {
  BKPER_API_KEY?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use(logger());
app.use(prettyJSON());

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Root route - serves as menu entry point
// Receives bookId from Bkper when opened from menu
app.get('/', async (c) => {
  const bookId = c.req.query('bookId');
  
  // The static assets (index.html) will be served by Wrangler's asset handling
  // This route can be used for server-side rendering or API calls
  
  return c.json({
    message: 'Menu endpoint',
    bookId,
  });
});

export default app;
