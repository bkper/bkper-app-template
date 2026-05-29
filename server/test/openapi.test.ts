import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('server OpenAPI contract', () => {
    it('documents only public app API routes', async () => {
        const response = await app.request('/openapi.json');
        expect(response.status).toBe(200);

        const spec = (await response.json()) as {
            paths: Record<string, unknown>;
            components?: { schemas?: Record<string, unknown> };
        };

        expect(Object.keys(spec.paths).sort()).toEqual([
            '/api/books',
            '/api/books/{bookId}/balances',
            '/api/ping',
        ]);
        expect(spec.paths['/events']).toBeUndefined();
        expect(spec.paths['/health']).toBeUndefined();
        expect(spec.paths['/api/test/kv/{key}']).toBeUndefined();
        const schemas = spec.components?.schemas ?? {};
        expect(schemas.ErrorResponse).toBeDefined();
        expect(schemas.ApiErrorCode).toBeUndefined();
        expect(schemas.ErrorResponse).toMatchObject({
            properties: {
                error: {
                    properties: {
                        code: { type: 'string' },
                    },
                },
            },
        });
    });

    it('returns a standardized API not found error', async () => {
        const response = await app.request('/api/missing');
        expect(response.status).toBe(404);

        expect(await response.json()).toEqual({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Route not found: GET /api/missing',
            },
        });
    });
});
