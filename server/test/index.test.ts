import { describe, expect, it } from 'vitest';
import app from '../src/index';
import { createTestEnv } from './test-env';

describe('server Worker composition', () => {
    it('serves client assets outside API and event routes', async () => {
        const response = await app.request('/client-route', {}, createTestEnv());

        expect(response.status).toBe(200);
        expect(await response.text()).toBe('asset fallback');
    });
});
