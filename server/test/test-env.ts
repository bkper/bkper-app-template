export function createTestEnv() {
    const values = new Map<string, string>();

    return {
        KV: {
            get: async (key: string) => values.get(key) ?? null,
            put: async (key: string, value: string) => {
                values.set(key, value);
            },
            delete: async (key: string) => {
                values.delete(key);
            },
            list: async () => ({ keys: [], list_complete: true }),
        },
        ASSETS: {
            fetch: async () => new Response('asset fallback'),
        },
    };
}
