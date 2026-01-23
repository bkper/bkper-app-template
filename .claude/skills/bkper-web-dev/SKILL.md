# Bkper Web Development

Knowledge for building web interfaces for Bkper apps using `@bkper/web-*` packages, Lit components, and Hono.

## Web SDK Packages

| Package | Purpose |
|---------|---------|
| `@bkper/web-auth` | OAuth authentication client |
| `@bkper/web-design` | CSS design tokens and theming |

## Authentication (@bkper/web-auth)

### Installation

```bash
bun add @bkper/web-auth
```

### Basic Usage

```typescript
import { BkperAuth } from '@bkper/web-auth';

const auth = new BkperAuth({
  onLoginSuccess: () => {
    // User is authenticated, load app data
    loadUserData();
  },
  onLoginRequired: () => {
    // Show login button/UI
    showLoginButton();
  },
  onError: (error) => {
    console.error('Auth error:', error);
  },
  onTokenRefresh: (token) => {
    // Token refreshed, update API client
    updateApiClient(token);
  },
  onLogout: () => {
    // Clean up before redirect
    clearLocalState();
  },
});

// Initialize on app load (restores session)
await auth.init();
```

### API Reference

```typescript
// Get current access token (undefined if not authenticated)
const token = auth.getAccessToken();

// Redirect to login page
auth.login();

// Refresh access token (call on 403)
await auth.refresh();

// Logout and redirect
auth.logout();
```

### Using with Fetch

```typescript
async function apiFetch(url: string, options: RequestInit = {}) {
  const token = auth.getAccessToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  // Handle token expiration
  if (response.status === 403) {
    await auth.refresh();
    return apiFetch(url, options); // Retry with new token
  }

  return response;
}
```

### Custom Auth Base URL

```typescript
// For development or custom deployments
const auth = new BkperAuth({
  baseUrl: 'https://custom-auth.example.com',
  // ... callbacks
});
```

## Design System (@bkper/web-design)

### Installation

```bash
bun add @bkper/web-design
```

### Usage in CSS

```css
@import '@bkper/web-design';

.my-component {
  color: var(--bkper-font-color-default);
  font-size: var(--bkper-font-size-medium);
  padding: var(--bkper-spacing-medium);
  border: var(--bkper-border);
  border-radius: var(--bkper-border-radius);
}
```

### Usage via CDN

```html
<link rel="stylesheet" href="https://bkper.app/design/v2/style.css">
```

### Design Tokens

#### Typography
```css
--bkper-font-size-x-small   /* 0.75rem */
--bkper-font-size-small     /* 0.85rem */
--bkper-font-size-medium    /* 1rem */
--bkper-font-size-large     /* 1.25rem */
--bkper-font-color-default
--bkper-font-weight-bold
--bkper-line-height-normal  /* 1.8 */
```

#### Spacing
```css
--bkper-spacing-3x-small    /* 0.125rem */
--bkper-spacing-2x-small    /* 0.25rem */
--bkper-spacing-x-small     /* 0.5rem */
--bkper-spacing-small       /* 0.75rem */
--bkper-spacing-medium      /* 1rem */
--bkper-spacing-large       /* 1.5rem */
--bkper-spacing-x-large     /* 2rem */
```

#### Colors
```css
/* Semantic colors */
--bkper-color-primary
--bkper-color-success
--bkper-color-danger
--bkper-color-warning
--bkper-color-neutral

/* Account type colors (light theme) */
--bkper-color-blue-high     /* Assets */
--bkper-color-yellow-high   /* Liabilities */
--bkper-color-green-high    /* Incoming */
--bkper-color-red-high      /* Outgoing */

/* Each color has low/medium/high variants */
--bkper-color-blue-low
--bkper-color-blue-medium
--bkper-color-blue-high
```

#### Borders
```css
--bkper-border              /* 1px solid border-color */
--bkper-border-color
--bkper-border-radius       /* 0.375rem */
```

### Theming (Light/Dark)

```html
<!-- Light theme (default) -->
<body class="wa-light">

<!-- Dark theme -->
<body class="wa-dark">
```

Colors automatically adjust for dark theme.

## Lit Components

### Basic Component Structure

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@bkper/web-design';

@customElement('my-component')
export class MyComponent extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: var(--bkper-spacing-medium);
    }
    
    .title {
      font-size: var(--bkper-font-size-large);
      font-weight: var(--bkper-font-weight-bold);
    }
    
    .amount-positive {
      color: var(--bkper-color-green-high);
    }
    
    .amount-negative {
      color: var(--bkper-color-red-high);
    }
  `;

  @property({ type: String })
  bookId = '';

  @state()
  private loading = false;

  render() {
    return html`
      <div class="title">My Component</div>
      ${this.loading 
        ? html`<div>Loading...</div>` 
        : html`<slot></slot>`
      }
    `;
  }
}
```

### Using with BkperAuth

```typescript
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { BkperAuth } from '@bkper/web-auth';

@customElement('my-app')
export class MyApp extends LitElement {
  private auth = new BkperAuth({
    onLoginSuccess: () => this.authenticated = true,
    onLoginRequired: () => this.authenticated = false,
  });

  @state()
  private authenticated = false;

  async connectedCallback() {
    super.connectedCallback();
    await this.auth.init();
  }

  render() {
    if (!this.authenticated) {
      return html`
        <button @click=${() => this.auth.login()}>
          Login with Bkper
        </button>
      `;
    }

    return html`
      <my-dashboard></my-dashboard>
      <button @click=${() => this.auth.logout()}>Logout</button>
    `;
  }
}
```

## Hono Web Server

### Basic Setup

```typescript
import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';

type Env = {
  BKPER_API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

// Serve static client assets
app.use('/*', serveStatic({ root: './' }));

// API routes
app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.get('/api/book/:bookId', async (c) => {
  const { bookId } = c.req.param();
  // Fetch book data...
  return c.json({ bookId });
});

export default app;
```

### Menu Integration Route

```typescript
// Handle menu popup opening
app.get('/', async (c) => {
  const bookId = c.req.query('bookId');
  
  // Return HTML that loads your Lit app
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="https://bkper.app/design/v2/style.css">
        <script type="module" src="/index.js"></script>
      </head>
      <body class="wa-light">
        <my-app book-id="${bookId}"></my-app>
      </body>
    </html>
  `);
});
```

## Project Structure

```
packages/web/
├── client/                 # Lit components (browser)
│   ├── src/
│   │   ├── index.html
│   │   ├── index.ts
│   │   └── components/
│   │       └── my-component.ts
│   ├── package.json
│   └── vite.config.ts
│
└── server/                 # Hono worker (serves client + API)
    ├── src/
    │   ├── index.ts
    │   └── routes/
    │       └── api.ts
    ├── package.json
    └── wrangler.jsonc
```

## Development Workflow

```bash
# Start development server
bun run dev

# Build for production
bun run build

# Deploy to Bkper Platform
bkper deploy
```
