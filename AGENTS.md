# My Bkper App

## Overview

A Bkper app using the single Worker platform model:

- **Client**: Lit + Web Awesome book picker and accounts list with balances, layered into component, controller, auth, service, and API concerns (`bkper-js` + `@bkper/web-auth`)
- **Server**: Hono Worker serving typed OpenAPI `/api/v1/*` routes and `/events`
- **Events**: Creates a 20% draft transaction on `TRANSACTION_CHECKED`

## Architecture principles

This template is intentionally opinionated. It should be enough to bootstrap an app and provide a strong basis for growing it.

Treat the app API as a first-class product surface:

- Expose reusable app behavior through typed `/api/v1/*` routes whenever it may be used by more than one caller.
- The shipped web client is only one consumer of the API; scripts, external clients, and agents should be able to call the same routes.
- Keep business behavior in `server/src/services/` and expose it through thin routes in `server/src/api/routes.ts`.
- Keep route contracts in `server/src/api/schemas.ts` and document them through the generated OpenAPI spec at `/openapi.json`.
- Keep Lit components focused on rendering and user intent. Do not hide app behavior only in UI components.
- Prefer adding meaning with typed request/response schemas and properties before adding new structural layers.

When adding API behavior, update the server schema and route, add or update unit tests, regenerate the typed client API types with `bun run api`, and intentionally update the OpenAPI snapshot when the public contract changes.

## Post-Init Checklist

After running `bkper app init`, customize:

1. `bkper.yaml` identity and ownership fields
2. Logos in `client/public/images/`
3. `README.md` for end users, including the app's API base URL and `/openapi.json` link
4. Commit the customized App on `main`, then run `bkper app sync`

The first sync selects private Bkper-managed source only when that same sync creates an eligible standalone App and no Git remote exists. Add an external provider remote before first sync to opt out. Existing Apps, external remotes, and monorepos are preserved and never migrated automatically.

## Authentication

Do not implement custom OAuth flows, redirect handling, or token refresh.

| Context               | Pattern                                                                                                               | Location                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Web client direct API | `@bkper/web-auth` provides the token and refresh operation configured in `bkper-js`                                   | `client/src/auth/auth-session.ts`, `client/src/services/book-service.ts` |
| Client app API calls  | The typed API client uses `auth.authenticatedFetch()`; other callers send `Authorization: Bearer <token>` to `/api/v1/*` | `client/src/api/app-api.ts`       |
| Server API routes     | Platform validates bearer auth and injects auth for server-side `new Bkper()` calls                                    | `server/src/api/routes.ts`        |
| Event handlers        | Platform routes `/events`; handler uses `new Bkper()` with outbound auth injection                                    | `server/src/events/routes.ts`     |
| Local dev             | Vite client auth and local outbound both use your CLI credentials (`bkper auth login`)                                | `client/vite.config.ts`, `bkper app dev` |

## Structure

```
client/  — Frontend UI package (Vite + Lit) with browser-only dependencies
server/  — Hono Worker package for /api/v1/* and /events with server/runtime dependencies
```

The root package orchestrates install, dev, test, build, and deploy. Keep browser UI dependencies in `client/package.json`, Worker dependencies in `server/package.json`, and root dependencies limited to cross-package tooling such as the Bkper CLI, Miniflare, and OpenAPI generation.

Client code is intentionally small but layered so template users see where each concern belongs:

```
client/src/
├── index.ts      — Browser entrypoint
├── web-awesome.ts — Web Awesome component registration for the client UI
├── components/   — Lit presentation components only
├── app/          — UI state and lifecycle orchestration
├── auth/         — @bkper/web-auth session boundary
├── services/     — App use cases and bkper-js orchestration
└── api/          — Typed /api/v1 client and generated OpenAPI types
```

Keep components focused on rendering and user intent. Register only the Web Awesome components used by the template in `web-awesome.ts`, and style with `@bkper/web-design` tokens. Put auth mechanics in `auth/`, Bkper/client API calls in `services/` and `api/`, and page loading/navigation flow in `app/`.

## UI grounding

Web Awesome official Agent Skills are generated resources synced from the installed `@awesome.me/webawesome` package by running:

```bash
bun run agent:skills
```

Before UI work, agents must read:

- `.agents/skills/webawesome/SKILL.md`
- `.agents/skills/webawesome-design/SKILL.md`

Preserve the template UI foundation:

- Use Web Awesome components as the primary UI building blocks.
- Style with `@bkper/web-design` tokens instead of ad-hoc design constants.
- Keep the first-paint dark mode script in `client/index.html` before `/src/index.ts`.
- Keep the client/server layering described above.
- Keep the typed API/OpenAPI workflow: update schemas/routes/tests, run `bun run api`, and review the OpenAPI snapshot for public contract changes.

Server code is layered so template users can see where each concern belongs:

```
server/src/
├── index.ts      — Worker composition, middleware, health, static assets
├── api/          — HTTP API routes, OpenAPI schemas, API error responses
├── events/       — Bkper event ingress, dispatch, and event adapters
└── services/     — App behavior and Bkper SDK orchestration
```

Keep route handlers thin. Put API shape and validation in `api/`, event transport concerns in `events/`, and business behavior in `services/`.

## API contract

The app's public API lives under `/api/v1/*` and is documented at `/openapi.json`.

| Concern                    | File                                      |
| -------------------------- | ----------------------------------------- |
| OpenAPI document metadata  | `server/src/api/openapi.ts`               |
| Request/response schemas   | `server/src/api/schemas.ts`               |
| API route definitions      | `server/src/api/routes.ts`                |
| Server business behavior   | `server/src/services/`                    |
| Generated client types     | `client/src/api/generated/types.d.ts`     |
| Shipped web client wrapper | `client/src/api/app-api.ts`               |

Design API operations around the app's domain behavior, not around the current UI. The UI should call the same routes that another authenticated client could call.

API evolution rules:

- `/openapi.json` is the single canonical public contract. It may contain multiple API versions over time.
- Keep `/api/v1/*` and its existing schema names stable once clients may depend on them.
- Do not rename or version schemas just for additive changes. Old generated clients should keep working until they explicitly upgrade.
- Safe changes are additive: new routes, new optional request fields, and new optional response fields.
- Breaking changes include removing or renaming fields, changing field types or meaning, changing route semantics, narrowing accepted input, or making optional inputs required.
- Put breaking changes in a new namespace such as `/api/v2/*`; do not mutate existing `v1` contracts.
- Add new versioned schemas only when a breaking payload shape is needed. Keep the old schema available for old routes.
- Mark old operations with OpenAPI `deprecated: true` only after a migration path exists.
- The committed contract snapshot is `server/test/openapi.snapshot.json`; update it only after reviewing the API change.

Agent API change checklist:

1. Classify the requested API change before editing code: additive or breaking.
2. If additive, keep the existing API version and schema names; update routes, schemas, tests, generated client types, and the OpenAPI snapshot.
3. If breaking, add a new API version such as `/api/v2/*`; preserve the old route handlers and schemas for existing clients.
4. Never remove, rename, or tighten a published `v1` field or route unless the user explicitly asks to break compatibility.

Authentication for `/api/v1/*` callers is always bearer-token based:

```http
Authorization: Bearer <bkper-oauth-token>
```

Inside server API routes, do not read or forward that token manually. Use server-side `new Bkper()` and let the platform validate inbound auth and inject outbound auth for Bkper API calls.

## Development

```bash
bkper auth login
bun install
bun run dev
```

This runs:

- `vite dev` — client dev server with HMR
- `bkper app dev` — one Miniflare Worker and an event tunnel to the same Worker when events are configured

## Verification

Before considering a code change complete, run the deterministic root check:

```bash
bun run check
```

This regenerates derived API/environment types, typechecks and tests the app against them, verifies production builds, checks formatting, and fails if tracked generated files are stale.

## Build and deploy

```bash
bun run deploy:preview # local build + explicit preview deployment
bun run deploy         # local build + explicit production deployment
```

Git push never deploys. Managed sync/deploy safely push a clean committed attached branch and deployment verifies that exact remote commit before uploading the existing local build. This is best-effort source provenance, not reproducible remote CI. External and monorepo workflows retain direct upload behavior.

For a managed rollback, create an attached `rollback/<name>` branch at the selected commit, build locally, and deploy explicitly. To clone managed source, run `bkper app clone <appId> [path]`, enter the clone, and run `bun install`; clone never executes repository lifecycle scripts.

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
| Configure client dev/build | `client/vite.config.ts`                                         |
| Add API schemas            | `server/src/api/schemas.ts`                                     |
| Add API endpoints          | `server/src/api/routes.ts`                                      |
| Add server behavior        | `server/src/services/`                                          |
| Regenerate API types       | `bun run api`                                                   |
| Handle events              | `server/src/events/routes.ts` and `server/src/events/handlers/` |
| Configure app              | `bkper.yaml`                                                    |
