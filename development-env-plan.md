# Bkper App Development Environment Plan

## Executive Summary

This plan establishes a CLI-centric development experience where `bkper app dev` and `bkper app build` abstract away all build tooling (Vite, Miniflare, esbuild), allowing developers to focus entirely on app logic.

**Key Decision:** The CLI owns the development and build tooling. Developers interact only with `bkper.yaml` and their source code—no Wrangler, Vite, or Miniflare configuration files.

---

## Goals

1. **Zero-config development** - `bkper app dev` starts everything
2. **Single source of truth** - `bkper.yaml` defines all configuration
3. **Auto-detect and run** - CLI figures out what's configured and runs it
4. **Fast iteration** - HMR for client, hot reload for server, auto-deploy for events
5. **Platform abstraction** - Developers don't see Workers for Platforms complexity
6. **AI-friendly** - Minimal concepts for assistants to understand

---

## Architecture Overview

```
Developer Experience:
┌────────────────────────────────────────────────────────────────────┐
│  bkper app dev                                                    │
│                                                                    │
│  Reads bkper.yaml → Auto-detects what's configured → Starts all   │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │   Vite (client)  │  │ Miniflare (server)│  │ Watch + Deploy   │ │
│  │   :5173          │←→│     :8787        │  │ (events handler) │ │
│  │   HMR enabled    │  │   Workers sim    │  │                  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│           ↑                     ↑                     ↑           │
│           └─────────────────────┴─────────────────────┘           │
│                          bkper.yaml                               │
└────────────────────────────────────────────────────────────────────┘
```

### What the Developer Sees

```
my-app/
├── bkper.yaml              ← Only configuration file
├── package.json            ← Dependencies only (no scripts needed)
├── tsconfig.json           ← TypeScript config
└── packages/
    ├── shared/src/         ← Shared types/utilities
    ├── web/
    │   ├── client/src/     ← Frontend (Lit, HTML, CSS)
    │   └── server/src/     ← Backend (Hono routes)
    └── events/src/         ← Event handlers (Hono)
```

### What the CLI Does Internally

```
bkper app dev:
├── Parse bkper.yaml
├── Detect what's configured (web, events, or both)
├── For web:
│   ├── Build server TypeScript → esbuild → in-memory bundle
│   ├── Start Miniflare with bundle
│   ├── Start Vite with proxy to Miniflare
│   └── Watch server files → rebuild + reload Miniflare
├── For events:
│   ├── Watch source files
│   ├── On change: build + deploy to dev environment
│   └── Show deployed URL for testing
└── Display unified status
```

---

## CLI Command Specifications

### `bkper app dev`

**Purpose:** Start the full development environment. Auto-detects and runs everything configured.

**Usage:**

```bash
bkper app dev [options]

Options:
  --port <port>         Client dev server port (default: 5173)
  --server-port <port>  Server simulation port (default: 8787)
```

**Behavior:**

1. **Read `bkper.yaml`** and detect what's configured
2. **Start everything that exists:**
    - If `deployment.web` configured → start Vite + Miniflare
    - If `deployment.events` configured → start watcher + auto-deploy
3. **Skip gracefully** what's not configured
4. **Display clear status** of what's running

**Output Examples:**

Full app (web + events):

```
$ bkper app dev

🚀 Bkper App Development Server

   Web Client:   http://localhost:5173
   Web Server:   http://localhost:8787 (simulated)
   Events:       https://my-app-dev.bkper.app/events (watching)

   Press Ctrl+C to stop
```

Web-only app:

```
$ bkper app dev

🚀 Bkper App Development Server

   Web Client:   http://localhost:5173
   Web Server:   http://localhost:8787 (simulated)
   Events:       Not configured

   Press Ctrl+C to stop
```

Events-only app (headless bot):

```
$ bkper app dev

🚀 Bkper App Development Server

   Web:          Not configured
   Events:       https://my-app-dev.bkper.app/events (watching)

   Press Ctrl+C to stop
```

**Runtime Output:**

```
[server] 🔄 index.ts changed, reloading...
[server] ✅ Server reloaded

[events] 📝 Change detected: handler.ts
[events] 🔨 Building...
[events] 🚀 Deploying to dev...
[events] ✅ Deployed
```

---

### `bkper app build`

**Purpose:** Build all configured handlers for deployment.

**Usage:**

```bash
bkper app build
```

**Behavior:**

1. **Read `bkper.yaml`** and detect what's configured
2. **Build everything that exists:**
    - Web client → Vite build → `dist/web/client/`
    - Web server → esbuild → `dist/web/server/index.js`
    - Events → esbuild → `dist/events/index.js`
3. **Skip gracefully** what's not configured
4. **Report results** with bundle sizes

**Output:**

```
$ bkper app build

📦 Building Bkper App...

   ✓ Web client    → dist/web/client/    (145 KB)
   ✓ Web server    → dist/web/server/    (23 KB)
   ✓ Events        → dist/events/        (18 KB)

✅ Build complete
```

---

### Command Summary

| Command                            | What it does                                   |
| ---------------------------------- | ---------------------------------------------- |
| `bkper app dev`                   | Start dev server for everything configured     |
| `bkper app build`                 | Build everything configured                    |
| `bkper app deploy`                | Deploy everything (web + events) to production |
| `bkper app deploy --dev`          | Deploy everything to dev environment           |
| `bkper app deploy --events`       | Deploy only events handler                     |
| `bkper app deploy --dev --events` | Deploy only events to dev                      |

Granularity exists in `deploy` because that's where you need control. For `dev` and `build`, just do everything.

---

## Updated bkper.yaml Schema

**New format (source entry points):**

```yaml
deployment:
    web:
        main: packages/web/server/src/index.ts # Worker entry point (TypeScript)
        client: packages/web/client # Vite project root
    events:
        main: packages/events/src/index.ts # Worker entry point (TypeScript)
    services:
        - KV # Fixed binding names
    secrets: # User-defined secrets
        - API_KEY
        - WEBHOOK_URL
    compatibility_date: "2026-01-29" # Workers runtime compatibility (set to current date on init)
```

**Backward Compatibility:**

The CLI detects whether paths point to:

- **TypeScript files** (`.ts`) → New mode, CLI handles build
- **Directories** (no extension) → Legacy mode, expects pre-built artifacts

---

## Types Generation

The CLI automatically generates TypeScript types for the `Env` object that Cloudflare Workers use. This provides type safety for service bindings and secrets without requiring external dependencies.

### Generated Files

| File                | Source             | Versioned          | Purpose                             |
| ------------------- | ------------------ | ------------------ | ----------------------------------- |
| `env.d.ts`          | services + secrets | ✅ Yes             | TypeScript Env interface + KV types |
| `.dev.vars.example` | secrets            | ✅ Yes             | Template for local dev secrets      |
| `.dev.vars`         | User creates       | ❌ No (gitignored) | Actual local secret values          |

### env.d.ts Generation

The CLI generates `env.d.ts` at the project root from the `bkper.yaml` configuration:

**Generated from:**

- `deployment.services` → Typed service bindings (e.g., `KV: KVNamespace`)
- `deployment.secrets` → Typed string properties (e.g., `API_KEY: string`)

**Example generated `env.d.ts`:**

```typescript
// env.d.ts
// AUTO-GENERATED by Bkper CLI from bkper.yaml
// Regenerate with: bkper app build

export interface Env {
    // Services
    KV: KVNamespace;

    // Secrets
    API_KEY: string;
    WEBHOOK_URL: string;
}

// KV types (inline, no external dependency)
interface KVNamespace {
    get(key: string, options?: { type?: "text" }): Promise<string | null>;
    get<T = unknown>(key: string, options: { type: "json" }): Promise<T | null>;
    get(key: string, options: { type: "arrayBuffer" }): Promise<ArrayBuffer | null>;
    get(key: string, options: { type: "stream" }): Promise<ReadableStream | null>;

    put(
        key: string,
        value: string | ArrayBuffer | ReadableStream,
        options?: KVNamespacePutOptions,
    ): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult>;
}

interface KVNamespacePutOptions {
    expiration?: number;
    expirationTtl?: number;
    metadata?: Record<string, any>;
}

interface KVNamespaceListOptions {
    prefix?: string;
    limit?: number;
    cursor?: string;
}

interface KVNamespaceListResult {
    keys: { name: string; expiration?: number; metadata?: Record<string, any> }[];
    list_complete: boolean;
    cursor?: string;
}
```

**Auto-update behavior:**

When running `bkper app dev` or `bkper app build`, the CLI:

1. Reads `bkper.yaml` configuration
2. Compares with existing `env.d.ts` (if present)
3. If mismatch detected:
    - Warns the user about the update
    - Auto-regenerates `env.d.ts`
    - Continues execution

**Why inline KV types?**

- No dependency on `@cloudflare/workers-types` package
- Simpler app templates with fewer dependencies
- CLI owns the type definitions, can update as needed

**Why versioned in git?**

- Provides type safety immediately on clone
- Developers can review type changes in PRs
- Works offline without CLI regeneration

### .dev.vars.example Generation

The CLI generates `.dev.vars.example` as a template for local development secrets:

**Generated from:**

- `deployment.secrets` → Secret names with placeholder values

**Example generated `.dev.vars.example`:**

```bash
# .dev.vars.example
# Copy this file to .dev.vars and fill in your local development values
# .dev.vars is gitignored and used by the Bkper CLI for local development

API_KEY=your-api-key-here
WEBHOOK_URL=https://example.com/webhook
```

**Developer workflow:**

1. Clone repository → `.dev.vars.example` is present (versioned)
2. Copy to `.dev.vars`: `cp .dev.vars.example .dev.vars`
3. Fill in actual secret values
4. Run `bkper app dev` → CLI loads secrets from `.dev.vars`

**Behavior when secrets missing:**

If `bkper app dev` runs and secrets are defined in `bkper.yaml` but missing from `.dev.vars`:

```bash
⚠️  Warning: Missing secrets in .dev.vars:
   - WEBHOOK_URL

   Copy .dev.vars.example to .dev.vars and add values.
   Continuing with undefined values...
```

The CLI warns but doesn't block development, allowing gradual addition of secrets.

**Why .dev.vars instead of .env?**

- Follows Wrangler/Miniflare convention
- Consistent with Cloudflare Workers ecosystem
- Clear separation from other .env uses (Vite, etc.)

### Secrets Management Summary

| Scope               | Command                       | Storage                       |
| ------------------- | ----------------------------- | ----------------------------- |
| **Local dev**       | `bkper app dev`              | `.dev.vars` file (gitignored) |
| **Deployed (dev)**  | `bkper app secrets put <name>` | Cloudflare encrypted storage  |
| **Deployed (prod)** | `bkper app secrets put <name>` | Cloudflare encrypted storage  |

**Secrets Command Behavior:**

The `bkper app secrets put` command uses **interactive prompts** to avoid storing secrets in shell history:

```bash
$ bkper app secrets put API_KEY
? Enter value for API_KEY: ••••••••••••••
✅ Secret API_KEY stored successfully
```

For automation (CI/CD, agents), use `--stdin`:

```bash
$ echo "$API_KEY" | bkper app secrets put API_KEY --stdin
✅ Secret API_KEY stored successfully
```

**Security rationale:**
- ❌ `bkper app secrets put API_KEY my-secret` - Exposes secret in shell history
- ✅ `bkper app secrets put API_KEY` - Prompts for value, hidden input
- ✅ `echo "$VAR" | bkper app secrets put API_KEY --stdin` - For automation

**Note:** Customer apps don't see platform secrets like `BKPER_TOKEN` or `BKPER_BOOK_ID`. The Workers for Platforms dispatch layer handles authentication internally.

---

## Simplified App Template

### package.json

```json
{
    "name": "my-bkper-app",
    "private": true,
    "type": "module",
    "workspaces": ["packages/*"],
    "dependencies": {
        "@bkper/web-auth": "latest",
        "@bkper/web-design": "latest",
        "bkper-js": "latest",
        "hono": "^4",
        "lit": "^3"
    },
    "devDependencies": {
        "typescript": "^5"
    }
}
```

**Note:**

- No `scripts` section needed—the CLI handles everything
- No `@cloudflare/workers-types` dependency—CLI generates types inline

### Project Structure

```
my-app/
├── bkper.yaml                  ← App configuration
├── package.json                ← Dependencies only (no scripts)
├── tsconfig.json               ← TypeScript config
├── env.d.ts                    ← Generated types (versioned)
├── .dev.vars.example           ← Secret template (versioned)
├── .dev.vars                   ← Local secrets (gitignored)
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   └── src/
│   │       └── types.ts
│   ├── web/
│   │   ├── client/
│   │   │   ├── index.html
│   │   │   └── src/
│   │   │       ├── app.ts
│   │   │       └── styles.css
│   │   └── server/
│   │       ├── package.json
│   │       └── src/
│   │           └── index.ts
│   └── events/
│       ├── package.json
│       └── src/
│           └── index.ts
└── README.md
```

### Example bkper.yaml

```yaml
id: my-app
name: My App
description: A Bkper app

menuUrl: https://${id}.bkper.app?bookId=${book.id}
menuUrlDev: http://localhost:5173?bookId=${book.id}

webhookUrl: https://${id}.bkper.app/events
webhookUrlDev: https://${id}-dev.bkper.app/events
events:
    - TRANSACTION_CHECKED

deployment:
    web:
        main: packages/web/server/src/index.ts
        client: packages/web/client
    events:
        main: packages/events/src/index.ts
    services:
        - KV
    secrets:
        - API_KEY
        - WEBHOOK_URL
    compatibility_date: "2026-01-29"
```

---

## Technical Deep Dive: Workers Compatibility

This section explains the technical decisions based on research of Cloudflare's official tooling (Wrangler, Vite plugin, and Miniflare).

### esbuild Configuration Rationale

| Setting | Value | Why |
|---------|-------|-----|
| `target` | `es2024` | Workers runtime uses V8 14.2+ which supports ES2024. Wrangler and the official Vite plugin use this target. Avoid `esnext` as it's not a fixed target. |
| `format` | `esm` | Modern Workers require ES Modules format. Service Worker format (IIFE) is legacy. |
| `conditions` | `['workerd', 'worker', 'browser']` | Critical for package resolution. Allows npm packages to provide Worker-specific exports via [conditional exports](https://nodejs.org/api/packages.html#conditional-exports). |
| `platform` | undefined or `neutral` | Workers are neither Node.js nor browsers. Wrangler defaults to undefined (browser-like). |

**Why `conditions` matters:**

Many modern npm packages use conditional exports to provide different implementations for different runtimes:

```json
// Example package.json
{
  "exports": {
    ".": {
      "workerd": "./dist/worker.js",    // Worker-optimized version
      "worker": "./dist/worker.js",      // Generic worker version
      "browser": "./dist/browser.js",    // Browser version
      "node": "./dist/node.js",          // Node.js version
      "default": "./dist/index.js"
    }
  }
}
```

Without the `conditions` setting, esbuild would use the wrong exports, potentially bundling Node.js or browser code that won't work in Workers.

**Why externalize `cloudflare:*` and `node:*`:**

- `cloudflare:workers` - Durable Objects, WorkerEntrypoint, RpcTarget
- `cloudflare:sockets` - TCP/UDP sockets API
- `cloudflare:email` - Email Workers API
- `node:buffer`, `node:crypto`, etc. - Built-in modules provided by `nodejs_compat`

These are provided by the Workers runtime and must not be bundled.

### Miniflare Configuration Rationale

| Setting | Value | Why |
|---------|-------|-----|
| `compatibilityDate` | `"2026-01-29"` | Controls which runtime features are enabled. Must match production to avoid surprises. Set to current date on `bkper app init`. |
| `compatibilityFlags` | `["nodejs_compat"]` | Enables Node.js built-in modules support. Matches common Bkper app patterns. |
| `liveReload` | `true` | Injects reload script into HTML responses for automatic browser refresh. |
| `kvPersist` | `"./.mf/kv"` | Persist KV data across restarts. Useful for development without losing data. |

**Understanding Miniflare Versioning vs `compatibility_date`:**

These are two different concepts that work together:

1. **Miniflare Package Version** (e.g., `4.20260128.0`):
   - The simulator/runtime binary version
   - Uses date-based versioning tied to `workerd` releases
   - Format: `MAJOR.YYYYMMDD.PATCH`
   - Using `^4` gets latest workerd improvements and bug fixes

2. **`compatibility_date` Config Setting**:
   - Controls which runtime features/behaviors are enabled
   - Acts as a "snapshot" of the runtime on that date
   - Same setting used in production Workers
   - This is your **stability control**, not the Miniflare version

**How they work together:**
```
Miniflare v4.20260128.0 (latest workerd)
  ↓
  Can simulate ANY compatibility_date
  ↓
  Your config: compatibility_date: "2026-01-29"
  ↓
  Enables features available up to 2026-01-29
  Disables features added after that date
  ↓
  Matches production behavior for that date
```

This means you can safely use `^4` for Miniflare (get latest simulator) while `compatibility_date` ensures consistent runtime behavior between local dev and production.

**KV namespace binding format:**

Miniflare v3+ prefers object format for named bindings:

```typescript
// Correct
kvNamespaces: { KV: "kv-local" }

// Also works but less clear
kvNamespaces: ["KV"]
```

The object format makes it explicit what binding name maps to what namespace ID.

### Vite Build Output Path

Vite's `outDir` is relative to the `root` option. To ensure output goes to the correct location:

```typescript
{
  root: "packages/web/client",  // Vite serves from here
  build: {
    outDir: path.resolve(process.cwd(), "dist/web/client"),  // Absolute path to project root
  }
}
```

Without `path.resolve()`, output would go to `packages/web/client/dist/web/client`.

---

## Implementation Plan

### Phase 1: CLI Foundation

**Files to create/modify in bkper-cli:**

```
src/commands/apps/
├── dev.ts          ← NEW: Development server command
├── build.ts        ← NEW: Build command
├── config.ts       ← MODIFY: Config parsing with new schema support
└── index.ts        ← MODIFY: Export new commands

src/dev/
├── vite.ts         ← NEW: Vite integration
├── miniflare.ts    ← NEW: Miniflare integration
├── esbuild.ts      ← NEW: esbuild bundling
├── watcher.ts      ← NEW: File watching
├── types.ts        ← NEW: Types generation (env.d.ts, .dev.vars.example)
└── logger.ts       ← NEW: Unified log output with prefixes

src/cli.ts          ← MODIFY: Register dev and build commands
```

**New dependencies for bkper-cli:**

```json
{
    "dependencies": {
        "miniflare": "^4",
        "vite": "^7.3.0",
        "esbuild": "^0.27.0",
        "chokidar": "^5.0.0",
        "get-port": "^7.1.0"
    }
}
```

**Version Strategy:**
- Use caret (`^`) to allow minor and patch updates (semver-compliant)
- Miniflare uses date-based versioning (`4.YYYYMMDD.patch`) tied to `workerd` releases
- `compatibility_date` in config controls runtime behavior, not the Miniflare version
- Staying current with Miniflare ensures bug fixes and simulator improvements

### Phase 2: Core Implementation

#### 2.1 Config Parser Update

```typescript
// src/commands/apps/config.ts

interface SourceDeploymentConfig {
    web?: {
        main: string; // Worker entry point (.ts)
        client: string; // Vite root directory
    };
    events?: {
        main: string; // Worker entry point (.ts)
    };
    services?: string[];
    secrets?: string[];
    compatibilityDate?: string; // Workers runtime compatibility date (camelCase in code, maps to compatibility_date in YAML)
}

function isSourceConfig(deployment: any): boolean {
    return deployment?.web?.main?.endsWith(".ts") || deployment?.events?.main?.endsWith(".ts");
}

// Example YAML mapping
function loadDeploymentConfig(): SourceDeploymentConfig {
    const yaml = readYamlFile('bkper.yaml');
    return {
        ...yaml.deployment,
        // Map snake_case (YAML) to camelCase (TypeScript)
        compatibilityDate: yaml.deployment.compatibility_date,
    };
}
```

#### 2.2 Types Generation

```typescript
// src/dev/types.ts

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

interface DeploymentConfig {
    services?: string[];
    secrets?: string[];
}

export function generateEnvTypes(config: DeploymentConfig): string {
    const lines: string[] = [
        "// env.d.ts",
        "// AUTO-GENERATED by Bkper CLI from bkper.yaml",
        "// Regenerate with: bkper app build",
        "",
        "export interface Env {",
    ];

    // Add service bindings
    if (config.services?.length) {
        lines.push("  // Services");
        for (const service of config.services) {
            if (service === "KV") {
                lines.push("  KV: KVNamespace;");
            }
        }
        lines.push("");
    }

    // Add secrets
    if (config.secrets?.length) {
        lines.push("  // Secrets");
        for (const secret of config.secrets) {
            lines.push(`  ${secret}: string;`);
        }
    }

    lines.push("}");

    // Add KV types inline if KV service is present
    if (config.services?.includes("KV")) {
        lines.push("");
        lines.push("// KV types (inline, no external dependency)");
        lines.push("interface KVNamespace {");
        lines.push("  get(key: string, options?: { type?: 'text' }): Promise<string | null>;");
        lines.push(
            "  get<T = unknown>(key: string, options: { type: 'json' }): Promise<T | null>;",
        );
        lines.push(
            "  get(key: string, options: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>;",
        );
        lines.push(
            "  get(key: string, options: { type: 'stream' }): Promise<ReadableStream | null>;",
        );
        lines.push("  ");
        lines.push(
            "  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVNamespacePutOptions): Promise<void>;",
        );
        lines.push("  delete(key: string): Promise<void>;");
        lines.push("  list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult>;");
        lines.push("}");
        lines.push("");
        lines.push("interface KVNamespacePutOptions {");
        lines.push("  expiration?: number;");
        lines.push("  expirationTtl?: number;");
        lines.push("  metadata?: Record<string, any>;");
        lines.push("}");
        lines.push("");
        lines.push("interface KVNamespaceListOptions {");
        lines.push("  prefix?: string;");
        lines.push("  limit?: number;");
        lines.push("  cursor?: string;");
        lines.push("}");
        lines.push("");
        lines.push("interface KVNamespaceListResult {");
        lines.push(
            "  keys: { name: string; expiration?: number; metadata?: Record<string, any> }[];",
        );
        lines.push("  list_complete: boolean;");
        lines.push("  cursor?: string;");
        lines.push("}");
    }

    return lines.join("\n") + "\n";
}

export function generateDevVarsExample(secrets: string[]): string {
    const lines: string[] = [
        "# .dev.vars.example",
        "# Copy this file to .dev.vars and fill in your local development values",
        "# .dev.vars is gitignored and used by the Bkper CLI for local development",
        "",
    ];

    for (const secret of secrets) {
        lines.push(`${secret}=your-${secret.toLowerCase().replace(/_/g, "-")}-here`);
    }

    return lines.join("\n") + "\n";
}

export function ensureTypesUpToDate(config: DeploymentConfig, projectRoot: string): void {
    const envDtsPath = resolve(projectRoot, "env.d.ts");
    const devVarsExamplePath = resolve(projectRoot, ".dev.vars.example");

    // Generate env.d.ts
    const newEnvTypes = generateEnvTypes(config);
    if (existsSync(envDtsPath)) {
        const existingEnvTypes = readFileSync(envDtsPath, "utf-8");
        if (existingEnvTypes !== newEnvTypes) {
            console.log("⚠️  env.d.ts is out of sync with bkper.yaml, updating...");
            writeFileSync(envDtsPath, newEnvTypes);
        }
    } else {
        console.log("✨ Generating env.d.ts...");
        writeFileSync(envDtsPath, newEnvTypes);
    }

    // Generate .dev.vars.example
    if (config.secrets?.length) {
        const newDevVarsExample = generateDevVarsExample(config.secrets);
        if (existsSync(devVarsExamplePath)) {
            const existingDevVarsExample = readFileSync(devVarsExamplePath, "utf-8");
            if (existingDevVarsExample !== newDevVarsExample) {
                console.log("⚠️  .dev.vars.example is out of sync with bkper.yaml, updating...");
                writeFileSync(devVarsExamplePath, newDevVarsExample);
            }
        } else {
            console.log("✨ Generating .dev.vars.example...");
            writeFileSync(devVarsExamplePath, newDevVarsExample);
        }
    }
}

export function loadDevVars(
    projectRoot: string,
    requiredSecrets: string[],
): Record<string, string> {
    const devVarsPath = resolve(projectRoot, ".dev.vars");
    const vars: Record<string, string> = {};

    if (!existsSync(devVarsPath)) {
        if (requiredSecrets.length > 0) {
            console.log("⚠️  Warning: .dev.vars not found");
            console.log("   Copy .dev.vars.example to .dev.vars and add values.");
            console.log("   Continuing with undefined values...\n");
        }
        return vars;
    }

    const content = readFileSync(devVarsPath, "utf-8");
    const lines = content.split("\n");
    const missingSecrets: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
            const [key, ...valueParts] = trimmed.split("=");
            if (key) {
                vars[key.trim()] = valueParts.join("=").trim();
            }
        }
    }

    // Check for missing secrets
    for (const secret of requiredSecrets) {
        if (!vars[secret]) {
            missingSecrets.push(secret);
        }
    }

    if (missingSecrets.length > 0) {
        console.log("⚠️  Warning: Missing secrets in .dev.vars:");
        for (const secret of missingSecrets) {
            console.log(`   - ${secret}`);
        }
        console.log("\n   Copy .dev.vars.example to .dev.vars and add values.");
        console.log("   Continuing with undefined values...\n");
    }

    return vars;
}
```

#### 2.3 esbuild Integration

```typescript
// src/dev/esbuild.ts

import * as esbuild from "esbuild";

// Plugin to handle cloudflare:* and node:* imports
// These are provided by the Workers runtime and should not be bundled
const workersExternalsPlugin: esbuild.Plugin = {
    name: "workers-externals",
    setup(build) {
        // Cloudflare-specific imports (Durable Objects, Sockets, etc.)
        build.onResolve({ filter: /^cloudflare:.*/ }, () => ({ external: true }));
        
        // Node.js built-in modules (when using nodejs_compat)
        build.onResolve({ filter: /^node:.*/ }, () => ({ external: true }));
    },
};

export async function buildWorker(entryPoint: string): Promise<string> {
    const result = await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        
        // Format: Workers use ES Modules
        format: "esm",
        
        // Target: Workers runtime uses V8 with ES2024 support
        // Matches Wrangler and Cloudflare Vite plugin
        target: "es2024",
        
        // Conditions: Critical for proper package resolution
        // Allows packages to provide Worker-specific exports
        conditions: ["workerd", "worker", "browser"],
        
        // Output
        write: false,
        sourcemap: "inline",
        
        // Plugins
        plugins: [workersExternalsPlugin],
    });

    return result.outputFiles[0].text;
}

export async function buildWorkerToFile(entryPoint: string, outfile: string): Promise<void> {
    await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        format: "esm",
        target: "es2024",
        conditions: ["workerd", "worker", "browser"],
        outfile,
        sourcemap: true,
        minify: process.env.NODE_ENV === "production",
        plugins: [workersExternalsPlugin],
    });
}
```

#### 2.4 Miniflare Integration

```typescript
// src/dev/miniflare.ts

import { Miniflare, Log, LogLevel } from "miniflare";
import { buildWorker } from "./esbuild.js";

interface WorkerServerOptions {
    port: number;
    kvNamespaces?: string[];
    vars?: Record<string, string>;
    compatibilityDate?: string;
    persist?: boolean;
}

export async function createWorkerServer(
    entryPoint: string,
    options: WorkerServerOptions,
): Promise<Miniflare> {
    const script = await buildWorker(entryPoint);

    const mf = new Miniflare({
        modules: true,
        script,
        port: options.port,
        
        // Compatibility settings (match production)
        compatibilityDate: options.compatibilityDate || "2026-01-29",
        compatibilityFlags: ["nodejs_compat"],
        
        // Logging
        log: new Log(LogLevel.INFO),
        
        // Live reload (inject script into HTML responses)
        liveReload: true,
        
        // KV namespaces - convert array to object format
        // ["KV"] -> { KV: "kv-local" }
        kvNamespaces: options.kvNamespaces?.reduce(
            (acc, ns) => ({ ...acc, [ns]: `${ns.toLowerCase()}-local` }),
            {},
        ),
        
        // Persist KV data across restarts
        kvPersist: options.persist !== false ? "./.mf/kv" : false,
        
        // Environment variables and secrets
        bindings: options.vars || {},
    });

    await mf.ready;
    return mf;
}

export async function reloadWorker(mf: Miniflare, entryPoint: string) {
    const script = await buildWorker(entryPoint);
    await mf.setOptions({ script });
}
```

#### 2.5 Vite Integration

```typescript
// src/dev/vite.ts

import { createServer, ViteDevServer } from "vite";
import path from "path";

export async function createClientServer(
    root: string,
    options: { port: number; serverPort: number },
): Promise<ViteDevServer> {
    const server = await createServer({
        root,
        server: {
            port: options.port,
            proxy: {
                // Proxy API requests to Miniflare
                "/api": {
                    target: `http://localhost:${options.serverPort}`,
                    changeOrigin: true,
                },
            },
        },
        // Build output relative to project root (not client root)
        build: {
            outDir: path.resolve(process.cwd(), "dist/web/client"),
            emptyOutDir: true,
        },
    });

    await server.listen();
    return server;
}
```

#### 2.6 Dev Command

```typescript
// src/commands/apps/dev.ts

import { createClientServer } from "../../dev/vite.js";
import { createWorkerServer, reloadWorker } from "../../dev/miniflare.js";
import { buildWorkerToFile } from "../../dev/esbuild.js";
import { ensureTypesUpToDate, loadDevVars } from "../../dev/types.js";
import { watch } from "chokidar";
import { loadAppConfig, loadDeploymentConfig } from "./config.js";
import { deployEvents } from "./deploy.js";
import path from "path";

export async function dev(options: { port?: number; serverPort?: number }) {
    const appConfig = await loadAppConfig();
    const deployConfig = await loadDeploymentConfig();

    // Ensure types are up to date
    ensureTypesUpToDate(deployConfig, process.cwd());

    // Load dev vars
    const devVars = loadDevVars(process.cwd(), deployConfig.secrets || []);

    const clientPort = options.port || 5173;
    const serverPort = options.serverPort || 8787;
    const eventsUrl = `https://${appConfig.id}-dev.bkper.app/events`;

    const hasWeb = !!deployConfig.web?.main;
    const hasEvents = !!deployConfig.events?.main;

    // Start web server (Miniflare)
    let mf: Miniflare | null = null;
    if (hasWeb) {
        mf = await createWorkerServer(deployConfig.web.main, {
            port: serverPort,
            kvNamespaces: deployConfig.services?.includes("KV") ? ["KV"] : [],
            vars: devVars,
            compatibilityDate: deployConfig.compatibilityDate,
            persist: true,
        });

        // Start web client (Vite)
        await createClientServer(deployConfig.web.client, {
            port: clientPort,
            serverPort,
        });

        // Watch server files for hot reload
        const serverDir = path.dirname(deployConfig.web.main);
        watch(serverDir, { ignoreInitial: true }).on("change", async (file) => {
            console.log(`[server] 🔄 ${path.basename(file)} changed, reloading...`);
            await reloadWorker(mf!, deployConfig.web.main);
            console.log("[server] ✅ Server reloaded");
        });
    }

    // Watch events files for auto-deploy
    if (hasEvents) {
        const eventsDir = path.dirname(deployConfig.events.main);
        let deploying = false;

        const deployToDevDebounced = debounce(async () => {
            if (deploying) return;
            deploying = true;

            try {
                console.log("[events] 🔨 Building...");
                await buildWorkerToFile(deployConfig.events.main, "dist/events/index.js");
                console.log("[events] 🚀 Deploying to dev...");
                await deployEvents(appConfig.id, "dev");
                console.log("[events] ✅ Deployed");
            } catch (err) {
                console.error("[events] ❌ Deploy failed:", err);
            } finally {
                deploying = false;
            }
        }, 500);

        watch(eventsDir, { ignoreInitial: true }).on("change", (file) => {
            console.log(`[events] 📝 Change detected: ${path.basename(file)}`);
            deployToDevDebounced();
        });

        // Initial deploy
        deployToDevDebounced();
    }

    // Display status
    console.log(`
🚀 Bkper App Development Server

   Web Client:   ${hasWeb ? `http://localhost:${clientPort}` : "Not configured"}
   Web Server:   ${hasWeb ? `http://localhost:${serverPort} (simulated)` : "Not configured"}
   Events:       ${hasEvents ? `${eventsUrl} (watching)` : "Not configured"}

   Press Ctrl+C to stop
  `);
}
```

#### 2.7 Build Command

```typescript
// src/commands/apps/build.ts

import { build as viteBuild } from "vite";
import { buildWorkerToFile } from "../../dev/esbuild.js";
import { ensureTypesUpToDate } from "../../dev/types.js";
import { loadDeploymentConfig } from "./config.js";
import { statSync } from "fs";
import path from "path";

export async function build() {
    const deployConfig = await loadDeploymentConfig();

    // Ensure types are up to date
    ensureTypesUpToDate(deployConfig, process.cwd());

    const hasWeb = !!deployConfig.web?.main;
    const hasEvents = !!deployConfig.events?.main;

    console.log("\n📦 Building Bkper App...\n");

    // Build web client
    if (hasWeb) {
        await viteBuild({
            root: deployConfig.web.client,
            build: { 
                outDir: path.resolve(process.cwd(), "dist/web/client"),
                emptyOutDir: true,
            },
            logLevel: "silent",
        });
        const clientSize = getDirSize("dist/web/client");
        console.log(`   ✓ Web client    → dist/web/client/    (${formatSize(clientSize)})`);

        // Build web server
        await buildWorkerToFile(deployConfig.web.main, "dist/web/server/index.js");
        const serverSize = statSync("dist/web/server/index.js").size;
        console.log(`   ✓ Web server    → dist/web/server/    (${formatSize(serverSize)})`);
    }

    // Build events
    if (hasEvents) {
        await buildWorkerToFile(deployConfig.events.main, "dist/events/index.js");
        const eventsSize = statSync("dist/events/index.js").size;
        console.log(`   ✓ Events        → dist/events/        (${formatSize(eventsSize)})`);
    }

    console.log("\n✅ Build complete\n");
}
```

### Phase 3: Template Simplification

1. Remove `packages/web/client/vite.config.ts`
2. Remove all `scripts` from `package.json` files
3. Update `bkper.yaml` to use new entry point syntax
4. Update `AGENTS.md` with new workflow
5. Update README with simplified instructions

### Phase 4: Dynamic Compatibility Date on Init

When running `bkper app init`, the CLI should automatically set `compatibility_date` to the current date, following Cloudflare's recommendation:

```typescript
// src/commands/apps/init.ts

function generateBkperYaml(appId: string, appName: string): string {
    // Set compatibility_date to today's date (YYYY-MM-DD format)
    const today = new Date().toISOString().split('T')[0];
    
    return `
id: ${appId}
name: ${appName}
description: A Bkper app

menuUrl: https://\${id}.bkper.app?bookId=\${book.id}
menuUrlDev: http://localhost:5173?bookId=\${book.id}

webhookUrl: https://\${id}.bkper.app/events
webhookUrlDev: https://\${id}-dev.bkper.app/events
events:
  - TRANSACTION_CHECKED

deployment:
  web:
    main: packages/web/server/src/index.ts
    client: packages/web/client
  events:
    main: packages/events/src/index.ts
  services:
    - KV
  secrets:
    - API_KEY
  compatibility_date: "${today}"
`;
}
```

**Rationale:**
- Cloudflare docs: "When you start your project, you should always set `compatibility_date` to the current date."
- Ensures new apps start with the latest runtime features
- Developers can update `compatibility_date` periodically by testing and updating the field in `bkper.yaml`
- Local dev and production will use the same compatibility date for consistency

### Phase 5: Documentation & Skills

1. Update bkper-cli README with new commands
2. Update bkper-app-template README
3. Update skills with new development patterns
4. Add troubleshooting guide
5. Document Node.js requirements (20.19+ or 22.12+ for Vite v7)

---

## Developer Workflow

### Getting Started

```bash
# Create new app
bkper app init my-app
cd my-app

# Install dependencies
bun install

# Start development
bkper app dev
```

### Daily Development

```bash
# Start dev server (everything auto-detected)
bkper app dev

# Build for deployment
bkper app build

# Deploy to dev
bkper app deploy --dev

# Deploy to production
bkper app deploy
```

---

## Benefits Summary

| Aspect                 | Before (Template-Owned)                      | After (CLI-Owned)             |
| ---------------------- | -------------------------------------------- | ----------------------------- |
| **Config files**       | bkper.yaml + vite.config.ts + wrangler.jsonc | bkper.yaml only               |
| **Commands to know**   | Multiple per-package scripts                 | `bkper app dev/build/deploy` |
| **Tooling knowledge**  | Vite, Wrangler, Miniflare, esbuild           | None required                 |
| **AI guidance**        | Must understand multiple tools               | Only bkper.yaml patterns      |
| **Dev server startup** | Manual orchestration                         | One command                   |
| **Updates**            | Update each app template                     | Update CLI, all apps benefit  |

---

## Risks & Mitigations

| Risk                     | Mitigation                                                    |
| ------------------------ | ------------------------------------------------------------- |
| CLI complexity increases | Well-structured code in `src/dev/`, comprehensive tests       |
| Miniflare API changes    | Abstract behind interface, pin versions                       |
| Edge cases in bundling   | Clear error messages, escape hatch for advanced users         |
| Debugging harder         | Prefix logs with [server]/[events], show file paths in errors |

---

## Open Questions

### 1. Vite config customization

**Decision: No custom `vite.config.ts` support initially**

**Rationale:** Cloudflare's Vite plugin is extremely complex (12+ sub-plugins) to handle all edge cases. We should keep the implementation simple and only extend when there's a specific need. The CLI can provide sensible defaults that cover 95% of use cases.

**Future consideration:** If needed, could add `vite.config.ts` merging support later, but ensure CLI settings take precedence to maintain consistency.

### 2. TypeScript config

**Decision: Apps provide their own `tsconfig.json`**

**Rationale:** TypeScript settings are project-specific (strict mode, lib versions, path mappings, etc.). The CLI should not impose these. However, apps should reference the generated `env.d.ts`:

```json
{
  "compilerOptions": {
    "types": ["./env.d.ts"]
  }
}
```

The CLI can validate that `env.d.ts` is referenced and warn if not.

### 3. Port conflicts

**Decision: Auto-detect available ports**

**Rationale:** Development environments vary. Use a port-finding utility (like `get-port`) to automatically find available ports if defaults are in use.

```typescript
import getPort from "get-port";

const clientPort = await getPort({ port: options.port || 5173 });
const serverPort = await getPort({ port: options.serverPort || 8787 });
```

This provides a smooth experience without requiring manual port configuration.

### 4. Inspector/Debugging Support

**Future consideration: Add `--inspect` flag**

Miniflare supports Chrome DevTools debugging via `inspectorPort`:

```typescript
const mf = new Miniflare({
  // ...
  inspectorPort: 9229,
});
```

Could be exposed as: `bkper app dev --inspect` or `bkper app dev --inspect-port 9229`

This would enable debugging Workers code with Chrome DevTools, which is valuable for complex applications.

---

## Next Steps

1. [ ] Review and approve this plan
2. [ ] Implement Phase 1 (CLI foundation) in bkper-cli
3. [ ] Implement Phase 2 (core dev/build commands)
4. [ ] Simplify bkper-app-template (Phase 3)
5. [ ] Update documentation and skills (Phase 4)
6. [ ] Test end-to-end workflow
7. [ ] Release CLI update

---

## Research Appendix

This plan is based on deep research of Cloudflare's official tooling:

### Sources

1. **@cloudflare/vite-plugin** (`workers-sdk` monorepo)
   - How Cloudflare configures esbuild for Workers compatibility
   - Miniflare integration patterns for local development
   - unenv-preset for Node.js compatibility layer
   - Virtual module system and HMR implementation

2. **Wrangler** (workers-sdk)
   - esbuild configuration and bundling approach
   - Default settings: `target: "es2024"`, `conditions: ["workerd", "worker", "browser"]`
   - Custom builds and module rules
   - Conditional exports support

3. **Miniflare v4**
   - Programmatic API for creating Worker instances
   - Configuration options for compatibility dates, flags, and bindings
   - Hot reload via `setOptions()`
   - Persistence and debugging features
   - Date-based versioning tied to workerd releases

4. **Vite v7**
   - Programmatic API (`createServer`, `build`) unchanged from v6
   - Requires Node.js 20.19+ or 22.12+
   - Default browser target updated to `baseline-widely-available`

### Key Learnings

1. **Target `es2024` not `esnext`**: Workers runtime uses a specific V8 version with known capabilities. `esnext` is a moving target.

2. **Conditions are critical**: Modern npm packages use conditional exports. The `workerd` condition allows packages to provide Worker-optimized code.

3. **Compatibility date is set on init**: Cloudflare recommends setting `compatibility_date` to the current date when starting a new project. This should be done automatically by `bkper app init`.

4. **Miniflare versioning vs runtime behavior**: Miniflare package version (e.g., `4.20260128.0`) is the simulator version. The `compatibility_date` config controls runtime behavior. These are separate concerns - use `^4` for Miniflare to get latest simulator while `compatibility_date` ensures consistent behavior.

5. **Simple is better**: Cloudflare's Vite plugin is extremely complex (handles HMR in Workers, Durable Objects, etc.). For our use case, we can use a much simpler approach.

6. **Miniflare is standalone**: We don't need Wrangler. Miniflare can be embedded directly in the CLI for better control and faster iteration.

7. **Latest stable versions**: As of January 2026:
   - Miniflare v4 (date-based versioning, API unchanged from v3)
   - Vite v7.3.1 (programmatic API unchanged from v6)
   - esbuild 0.27.2
   - chokidar 5.0.0
   - get-port 7.1.0

### References

- [Wrangler Bundling Docs](https://developers.cloudflare.com/workers/wrangler/bundling/)
- [Wrangler API Docs](https://developers.cloudflare.com/workers/wrangler/api/)
- [Miniflare Documentation](https://miniflare.dev/)
- [Workers Compatibility Dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/)
- [Vite 7.0 Announcement](https://vite.dev/blog/announcing-vite7)
- [Node.js Conditional Exports](https://nodejs.org/api/packages.html#conditional-exports)
- [Runtime Keys Proposal](https://runtime-keys.proposal.wintercg.org/)
