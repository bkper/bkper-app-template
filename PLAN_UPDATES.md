# Development Environment Plan - Updates Based on Research

## Summary

The development environment plan has been updated based on comprehensive research of Cloudflare's official tooling (Wrangler, Vite plugin, Miniflare v4, Vite v7). All recommendations now align with how Cloudflare's own tools work, ensuring compatibility and following best practices with the latest stable versions (January 2026).

## Key Changes

### 1. esbuild Configuration Updates

**Changed:**
- `target: "esnext"` → `target: "es2024"`
- `external: ["cloudflare:*"]` → Plugin-based externals for both `cloudflare:*` and `node:*`
- Added `conditions: ["workerd", "worker", "browser"]` for proper package resolution
- Removed `platform: "neutral"` (undefined is fine, matches Wrangler)

**Why:**
- Workers runtime uses V8 14.2+ with ES2024 support (fixed target)
- `conditions` enables packages to provide Worker-specific exports
- Both Cloudflare built-ins and Node.js built-ins need to be external

### 2. Miniflare Configuration Updates

**Added:**
- `compatibilityDate: "2026-01-29"` - Match production runtime features (set dynamically on init)
- `compatibilityFlags: ["nodejs_compat"]` - Enable Node.js built-in modules
- `liveReload: true` - Auto-refresh browser on changes
- `kvPersist: "./.mf/kv"` - Persist KV data across restarts
- `log: new Log(LogLevel.INFO)` - Proper logging

**Changed:**
- KV namespace format: `["KV"]` → `{ KV: "kv-local" }` (object format preferred)
- Miniflare version: `^3` → `^4` (date-based versioning, API unchanged)

**Why:**
- Local dev should match production behavior
- Persistence prevents data loss during development
- Live reload improves DX
- Miniflare v4 is not a breaking change - same API as v3

### 3. Vite Build Path Fix

**Changed:**
```typescript
// Before
build: { outDir: "dist/web/client" }

// After
build: { 
  outDir: path.resolve(process.cwd(), "dist/web/client"),
  emptyOutDir: true,
}
```

**Why:**
- Vite's `outDir` is relative to `root`, not project root
- Without absolute path, output goes to wrong location

### 4. Schema Update

**Changed in `bkper.yaml`:**
```yaml
# Before
deployment:
  compatibilityDate: "2024-09-23"

# After
deployment:
  compatibility_date: "2026-01-29"  # Set dynamically to current date on init
```

**Why:**
- Use `compatibility_date` (snake_case) to match Wrangler convention
- TypeScript code uses camelCase internally, maps to/from snake_case when reading YAML
- Cloudflare recommends setting to current date when creating new projects
- CLI will set this automatically on `bkper app init`

### 5. Dependencies Update

**Updated to latest stable versions (January 2026):**

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

**Major version changes:**
- Miniflare: `^3` → `^4` (date-based versioning, API unchanged)
- Vite: `^6` → `^7.3.0` (programmatic API unchanged, requires Node 20.19+)
- Chokidar: `^4` → `^5.0.0`
- esbuild: `^0.24` → `^0.27.0`

**Version strategy:**
- Use caret (`^`) for semver-compliant updates (allows minor + patch)
- Provides automatic bug fixes and new features within major versions
- `compatibility_date` in config controls runtime behavior, not package versions
- Miniflare uses date-based versioning tied to workerd releases

**Why caret over tilde:**
- Semver-compliant packages should not break in minor releases
- Security patches sometimes come in minor versions
- Community standard (npm defaults to `^`)
- `compatibility_date` is the actual stability control

### 6. New Documentation

**Added:**
- "Technical Deep Dive: Workers Compatibility" section
  - Explains esbuild configuration rationale
  - Explains Miniflare configuration rationale
  - Documents Miniflare versioning vs `compatibility_date` relationship
  - Documents conditional exports and why they matter
  
- "Research Appendix"
  - Documents research sources (Miniflare v4, Vite v7)
  - Lists key learnings including latest versions
  - Provides references for future work

**Added Phase 4:**
- Dynamic `compatibility_date` generation on `bkper app init`
- Code example showing how to set to current date (YYYY-MM-DD format)

**Updated:**
- "Open Questions" section with decisions and rationale
- Node.js requirement documentation (20.19+ or 22.12+ for Vite v7)

## Impact on Implementation

### Files to Update

All code examples in Phase 2 have been updated with correct configurations:

1. `src/dev/esbuild.ts` - New plugin-based externals, correct target/conditions
2. `src/dev/miniflare.ts` - Added compatibility settings, persistence, logging
3. `src/dev/vite.ts` - Fixed build output path
4. `src/commands/apps/dev.ts` - Pass compatibility settings to Miniflare
5. `src/commands/apps/build.ts` - Fixed Vite output path
6. `src/commands/apps/config.ts` - Added `compatibilityDate` to interface, snake_case YAML mapping
7. `src/commands/apps/init.ts` - NEW: Generate `compatibility_date` with current date

### Testing Priorities

1. **Package resolution** - Test that packages with `workerd` exports use the correct code
2. **Compatibility parity** - Ensure local dev matches production behavior
3. **KV persistence** - Verify data survives restarts
4. **Port conflicts** - Test auto-detection when defaults are in use
5. **Dynamic compatibility date** - Verify `bkper app init` sets current date
6. **Miniflare v4 compatibility** - Confirm all API usage works with v4
7. **Vite v7 compatibility** - Confirm programmatic API works with v7
8. **Node.js version** - Test with Node 20.19+ and 22.12+

## Alignment with Cloudflare Standards

| Aspect | Wrangler/Vite Plugin | Our Implementation | Status |
|--------|---------------------|-------------------|--------|
| esbuild target | `es2024` | `es2024` | ✅ Aligned |
| esbuild conditions | `['workerd', 'worker', 'browser']` | Same | ✅ Aligned |
| Externals | Plugin-based | Plugin-based | ✅ Aligned |
| Miniflare compat date | Required | Required + dynamic on init | ✅ Aligned |
| KV namespace format | Object | Object | ✅ Aligned |
| Output format | ESM | ESM | ✅ Aligned |
| Config field naming | `compatibility_date` | `compatibility_date` | ✅ Aligned |
| Latest versions | Miniflare v4, Vite v7 | Same | ✅ Aligned |

## Version Compatibility Matrix

| Dependency | Version | Node.js Requirement | Notes |
|------------|---------|---------------------|-------|
| Miniflare | ^4 | 18+ | Date-based versioning, API unchanged from v3 |
| Vite | ^7.3.0 | 20.19+ or 22.12+ | Programmatic API unchanged from v6 |
| esbuild | ^0.27.0 | 18+ | Latest stable |
| chokidar | ^5.0.0 | 16+ | Latest stable |
| get-port | ^7.1.0 | 18+ | Latest stable |

**Overall requirement:** Node.js **20.19+ or 22.12+** (driven by Vite v7)

## Next Actions

1. ✅ Plan updated with research findings
2. ✅ Latest stable versions researched (Miniflare v4, Vite v7)
3. ✅ Version strategy clarified (caret for semver-compliant updates)
4. ✅ `compatibility_date` dynamic generation designed
5. ⏳ Begin Phase 1 implementation with updated configurations
6. ⏳ Test against real Bkper app scenarios
7. ⏳ Validate output is compatible with Workers deployment

---

*Research completed: January 29, 2026*
*Sources: workers-sdk monorepo, Cloudflare documentation, Miniflare v4 releases, Vite 7 docs*
*Latest package versions verified via npm registry*
