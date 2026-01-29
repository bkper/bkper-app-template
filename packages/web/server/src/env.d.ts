/// <reference types="@cloudflare/workers-types" />

interface Env {
  // KV namespace for caching (auto-provisioned by Bkper Platform)
  // Binding name matches the type in bkper.yaml: bindings: [KV]
  KV: KVNamespace;

  // Secrets (set via: bkper apps secrets put)
  BKPER_API_KEY?: string;
}
