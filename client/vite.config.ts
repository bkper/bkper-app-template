import { defineConfig } from 'vite';
import { createBkperAuthMiddleware } from 'bkper/dev';

// BKPER_LIVE_HOST: the host that shows this dev server live (set by the Bkper Agent's sandbox).
// When set, Vite accepts that host and HMR goes through the page's own origin.
export default defineConfig(() => {
    const liveHost = process.env.BKPER_LIVE_HOST;

    return {
        build: {
            outDir: '../dist/client',
            emptyOutDir: true,
        },
        plugins: [
            {
                name: 'bkper-auth',
                configureServer(server) {
                    server.middlewares.use(createBkperAuthMiddleware());
                },
            },
        ],
        server: {
            host: '::',
            port: 5173,
            strictPort: true,
            proxy: {
                '/api': 'http://127.0.0.1:8787',
                '/openapi.json': 'http://127.0.0.1:8787',
            },
            ...(liveHost
                ? { allowedHosts: [liveHost] }
                : { hmr: { host: 'localhost', port: 5173, clientPort: 5173 } }),
        },
    };
});
