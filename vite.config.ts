import { defineConfig } from 'vite';
import { createBkperAuthMiddleware } from 'bkper/dev';

export default defineConfig({
    root: 'client',
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
        proxy: { '/api': 'http://localhost:8787' },
        hmr: {
            host: 'localhost',
            port: 5173,
            clientPort: 5173,
        },
    },
});
