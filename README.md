# My App

[Describe what your app does for Bkper users — the problem it solves and how it works. Keep this focused on the user experience, not the implementation.]

## What it does

[Explain the core functionality from a user's perspective. What happens when they open your app? What value does it provide?]

## How to use it

[Step-by-step instructions for end users. How do they access the app? What do they see? What actions can they take?]

## Source control and deployment

After `bkper app init`, install dependencies once and start local development:

```bash
npm install
npm run dev
```

Once customized, stop the development servers and create the first commit on `main`:

```bash
git add .
git commit -m "Initial app"
bkper app sync
```

If that sync creates the App, this is a standalone Git root, and no remote exists, Bkper selects private managed source and uploads the committed `main` branch. Add a GitHub, GitLab, or other provider remote **before the first sync** to keep external source instead.

Existing Apps, repositories with an external remote, and Apps nested in monorepos are never migrated automatically. The CLI never modifies an existing external remote.

Source storage and deployment are separate:

- `git push` only updates source and never deploys.
- `npm run build` builds locally.
- `bkper app deploy` explicitly uploads the existing local build.
- For managed source, sync/deploy require a clean committed attached branch and use fast-forward-only CLI pushes. Bkper verifies that the exact commit exists remotely, but does not claim that the local bundle was reproducibly built from it.

Clone an existing managed App without executing its repository code, then install explicitly:

```bash
bkper app clone <appId> [path]
cd <path-or-appId>
npm install
```

If managed Git authentication fails, run `bkper auth login` and retry. Credentials are short-lived and are not persisted by Bkper. Configured App developers, including domain-pattern developers, can read and modify private managed source.

To redeploy older source, keep `HEAD` attached to an ordinary rollback branch:

```bash
git switch -c rollback/<name> <older-commit>
npm run build
bkper app deploy --preview
# verify, then optionally:
bkper app deploy
```

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
- Run `npm test` before deploy. The OpenAPI paths and schemas are snapshot-tested in `server/test/openapi.snapshot.json`; update that snapshot only after intentionally reviewing the API change.

## Learn More

-   [Bkper Help Center](https://bkper.com/docs)
