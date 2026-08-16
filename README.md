# My App

[Describe what your app does for Bkper users—the problem it solves and how it works. Keep this focused on the user experience.]

## What it does

[Explain the core functionality from a user's perspective. What happens when they open the app? What value does it provide?]

## How to use it

[Provide step-by-step instructions for end users. Explain how they access the app, what they see, and what actions they can take.]

## API access

This app exposes an authenticated API for scripts and integrations.

Replace `my-app` with the app id from `bkper.yaml`.

```txt
Production: https://my-app.bkper.app
Preview:    https://my-app-preview.bkper.app
Local:      http://localhost:8787
```

OpenAPI specifications:

```txt
Production: https://my-app.bkper.app/openapi.json
Preview:    https://my-app-preview.bkper.app/openapi.json
Local:      http://localhost:8787/openapi.json
```

Call API routes with a Bkper OAuth bearer token:

```bash
BKPER_TOKEN="$(bkper auth token)"

curl \
  -H "Authorization: Bearer ${BKPER_TOKEN}" \
  "https://my-app.bkper.app/api/v1/books"
```

## Learn more

- [Bkper Help Center](https://bkper.com/docs)
