import { Hono } from 'hono';

type Env = {
  BKPER_API_KEY?: string;
};

const menu = new Hono<{ Bindings: Env }>();

// Menu popup endpoint - receives bookId from Bkper
menu.get('/', async (c) => {
  const bookId = c.req.query('bookId');
  
  // The static assets (index.html) will be served by Wrangler's asset handling
  // This route can be used for server-side rendering or API calls
  
  return c.json({
    message: 'Menu endpoint',
    bookId,
  });
});

export default menu;
