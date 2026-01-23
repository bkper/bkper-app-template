# Bkper App Template

> **Work in Progress** — This template is not ready for use yet. The CLI tooling is still under development.

A starter template for building apps on the [Bkper](https://bkper.com) platform.

## Tech Stack

- [Cloudflare Workers](https://workers.cloudflare.com/) — Serverless runtime
- [Hono](https://hono.dev/) — Web framework
- [Lit](https://lit.dev/) + [@bkper/web-design](https://www.npmjs.com/package/@bkper/web-design) — UI components
- [bkper-js](https://www.npmjs.com/package/bkper-js) — Bkper SDK

## Structure

- `packages/web/` — User-facing UI and API
- `packages/events/` — Background event processing
- `packages/shared/` — Shared code between web and events
