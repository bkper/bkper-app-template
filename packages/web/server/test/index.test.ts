import { afterEach, describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('web server API', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('returns books loaded through bkper-js from a server-side API route', async () => {
        const apiRequests: Request[] = [];
        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const request = input instanceof Request ? input : new Request(input, init);
            apiRequests.push(request);
            return new Response(
                JSON.stringify({
                    items: [
                        { id: 'book-1', name: 'Main Book' },
                        { id: 'book-2', name: 'Operations Book' },
                    ],
                }),
                { headers: { 'content-type': 'application/json' } }
            );
        };

        const response = await app.request('/api/books');
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({
            books: [
                { id: 'book-1', name: 'Main Book' },
                { id: 'book-2', name: 'Operations Book' },
            ],
        });
        expect(apiRequests).toHaveLength(1);
        expect(apiRequests[0].url).toStartWith('https://api.bkper.app/v5/books/');
    });
});
