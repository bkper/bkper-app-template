import { afterEach, describe, expect, it, vi } from 'vitest';
import viteConfig from '../vite.config';

const serve = () => viteConfig({ command: 'serve', mode: 'development' }).server;

describe('vite config', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('serves HMR on localhost by default', () => {
        vi.stubEnv('BKPER_LIVE_HOST', '');

        const server = serve();

        expect(server?.allowedHosts).toBeUndefined();
        expect(server?.hmr).toEqual({ host: 'localhost', port: 5173, clientPort: 5173 });
    });

    it('accepts the live host and keeps HMR on the page origin when BKPER_LIVE_HOST is set', () => {
        vi.stubEnv('BKPER_LIVE_HOST', 'live.bkper.app');

        const server = serve();

        expect(server?.allowedHosts).toEqual(['live.bkper.app']);
        expect(server?.hmr).toBeUndefined();
    });
});
