# My Bkper App

## Overview

A Bkper app using the single Worker platform model:

- **Client**: Book picker + accounts list with balances, layered into component, controller, auth, service, and API concerns (`bkper-js` + `@bkper/web-auth`)
- **Server**: Hono Worker serving typed OpenAPI `/api/*` routes and `/events`
- **Events**: Creates a 20% draft transaction on `TRANSACTION_CHECKED`

## Post-Init Checklist

After running `bkper app init`, customize:

1. `bkper.yaml` identity and ownership fields
2. Logos in `client/public/images/`
3. `README.md` for end users

## Authentication

Do not implement custom OAuth flows, redirect handling, or token refresh.

| Context               | Pattern                                                                                                              | Location                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Web client direct API | `@bkper/web-auth` in `auth/` → `auth.getAccessToken()` → `services/` using `bkper-js`                                 | `client/src/auth/auth-session.ts`, `client/src/services/book-service.ts` |
| Client app API calls  | Browser sends `Authorization: Bearer <token>` to `/api/*` through the typed API client                                | `client/src/api/app-api.ts`       |
| Server API routes     | Platform validates bearer auth and injects auth for server-side `new Bkper()` calls                                   | `server/src/api/routes.ts`        |
| Event handlers        | Platform routes `/events`; handler uses `new Bkper()` with outbound auth injection                                   | `server/src/events/routes.ts`     |
| Local dev             | Vite client auth and local outbound both use your CLI credentials (`bkper auth login`)                               | `vite.config.ts`, `bkper app dev` |

## Structure

```
client/  — Frontend UI (Vite + Lit)
server/  — Hono Worker for /api/* and /events
```

Client code is intentionally small but layered so template users see where each concern belongs:

```
client/src/
├── index.ts      — Browser entrypoint
├── components/   — Lit presentation components only
├── app/          — UI state and lifecycle orchestration
├── auth/         — @bkper/web-auth session boundary
├── services/     — App use cases and bkper-js orchestration
└── api/          — Typed /api client and generated OpenAPI types
```

Keep components focused on rendering and user intent. Put auth mechanics in `auth/`, Bkper/client API calls in `services/` and `api/`, and page loading/navigation flow in `app/`.

Server code is layered so template users can see where each concern belongs:

```
server/src/
├── index.ts      — Worker composition, middleware, health, static assets
├── api/          — HTTP API routes, OpenAPI schemas, API error responses
├── events/       — Bkper event ingress, dispatch, and event adapters
└── services/     — App behavior and Bkper SDK orchestration
```

Keep route handlers thin. Put API shape and validation in `api/`, event transport concerns in `events/`, and business behavior in `services/`.

## Development

```bash
bkper auth login
bun install
bun run dev
```

This runs:

- `vite dev` — client dev server with HMR
- `bkper app dev` — one Miniflare Worker and an event tunnel to the same Worker when events are configured

## Build and deploy

```bash
bun run preview # preview deployment
bun run deploy  # production deployment
```

Build output:

- OpenAPI client types → `client/src/api/generated/types.d.ts`
- Vite client build → `dist/client/`
- Worker bundle → `dist/server/`

## Configuration

```yaml
deployment:
    server: server/src/index.ts
    client: client
    services:
        - KV
    secrets: []
    compatibility_date: '2026-01-28'
```

## Key files

| Task                       | File                                                            |
| -------------------------- | --------------------------------------------------------------- |
| Add UI rendering           | `client/src/components/my-app.ts`                               |
| Add client page flow       | `client/src/app/app-controller.ts`                              |
| Add Bkper client behavior  | `client/src/services/book-service.ts`                           |
| Add typed client API calls | `client/src/api/app-api.ts`                                     |
| Add client auth behavior   | `client/src/auth/auth-session.ts`                               |
| Add API schemas            | `server/src/api/schemas.ts`                                     |
| Add API endpoints          | `server/src/api/routes.ts`                                      |
| Add server behavior        | `server/src/services/`                                          |
| Regenerate API types       | `bun run api`                                                   |
| Handle events              | `server/src/events/routes.ts` and `server/src/events/handlers/` |
| Configure app              | `bkper.yaml`                                                    |
