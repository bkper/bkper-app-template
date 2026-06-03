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
  "https://my-app.bkper.app/api/books"
```

Use the returned book id to call book-specific routes, such as `/api/books/{bookId}/balances`.

## Learn More

-   [Bkper Help Center](https://bkper.com/docs)
