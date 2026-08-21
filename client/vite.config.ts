import { defineConfig } from 'vite';
import { createBkperAuthMiddleware } from 'bkper/dev';

export default defineConfig({
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
        hmr: {
            host: 'localhost',
            port: 5173,
            clientPort: 5173,
        },
    },
});
