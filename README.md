# My App

[Describe what your app does for Bkper users — the problem it solves and how it works. Keep this focused on the user experience, not the implementation.]

## What it does

[Explain the core functionality from a user's perspective. What happens when they open your app? What value does it provide?]

## How to use it

[Step-by-step instructions for end users. How do they access the app? What do they see? What actions can they take?]

## API access

This app also exposes an API so the web client, scripts, and other authenticated clients can use the same app behavior.

Replace `my-app` with the app id from `bkper.yaml`.

Base URLs:

```txt
Production: https://my-app.bkper.app
Preview:    https://my-app-preview.bkper.app
Local:      http://localhost:8787
```

OpenAPI spec:

```txt
Production: https://my-app.bkper.app/openapi.json
Local:      http://localhost:8787/openapi.json
```

Call API routes with a Bkper OAuth bearer token:

```bash
BKPER_TOKEN="$(bkper auth token)"

curl \
  -H "Authorization: Bearer ${BKPER_TOKEN}" \
  "https://my-app.bkper.app/api/v1/books"
```

Use the returned book id to call book-specific routes, such as `/api/v1/books/{bookId}/balances`.

## API evolution

The public API is versioned under `/api/v1/*` and documented in one canonical spec at `/openapi.json`. Keep existing `v1` routes and schemas stable so old clients keep working until they explicitly upgrade.

- Prefer additive changes in `v1`: new routes, new optional request fields, and new optional response fields.
- Keep existing schema names stable. Do not rename or version schemas just for additive changes.
- Avoid breaking changes in `v1`: removing or renaming fields, changing field types or meaning, changing route behavior, narrowing accepted input, or making optional inputs required.
- Put breaking changes in a new version, such as `/api/v2/*`, while keeping `/api/v1/*` and its schemas available for existing clients.
- Run `bun test` before deploy. The OpenAPI paths and schemas are snapshot-tested in `server/test/openapi.snapshot.json`; update that snapshot only after intentionally reviewing the API change.

## Learn More

-   [Bkper Help Center](https://bkper.com/docs)
