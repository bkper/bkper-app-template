import { afterEach, describe, expect, it } from 'bun:test';
import app from '../src/index';

function createTestEnv() {
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

describe('server Worker', () => {
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

    it('keeps KV example endpoints under the authenticated API namespace', async () => {
        const env = createTestEnv();

        const writeResponse = await app.request(
            '/api/test/kv',
            {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ key: 'sample-key', value: 'sample-value' }),
            },
            env
        );
        const readResponse = await app.request('/api/test/kv/sample-key', {}, env);

        expect(writeResponse.status).toBe(200);
        expect(await writeResponse.json()).toEqual({ success: true, key: 'sample-key' });
        expect(readResponse.status).toBe(200);
        expect(await readResponse.json()).toEqual({
            key: 'sample-key',
            value: 'sample-value',
            found: true,
        });
    });

    it('returns JSON 404 for unknown API routes instead of serving client assets', async () => {
        const response = await app.request('/api/missing', {}, createTestEnv());

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: 'Not found' });
    });

    it('handles events without reading token or agent headers', async () => {
        const response = await app.request('/events', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'bkper-oauth-token': 'should-not-be-read',
                'bkper-agent-id': 'should-not-be-read',
            },
            body: JSON.stringify({
                type: 'UNKNOWN_EVENT',
                book: { id: 'book-1', name: 'Main Book' },
            }),
        });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ result: false });
    });

    it('creates a balanced draft transaction for checked transaction events', async () => {
        const apiRequests: Request[] = [];
        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const request = input instanceof Request ? input : new Request(input, init);
            apiRequests.push(request);
            return new Response(
                JSON.stringify({
                    transaction: { id: 'draft-1' },
                }),
                { headers: { 'content-type': 'application/json' } }
            );
        };

        const response = await app.request('/events', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'bkper-oauth-token': 'should-not-be-read',
                'bkper-agent-id': 'should-not-be-read',
            },
            body: JSON.stringify({
                type: 'TRANSACTION_CHECKED',
                book: { id: 'book-1', name: 'Main Book', fractionDigits: 2 },
                data: {
                    object: {
                        transaction: {
                            id: 'tx-1',
                            posted: true,
                            amount: '100',
                            description: 'Original sale',
                            date: '2026-05-27',
                            creditAccount: { id: 'from-account', name: 'Sales' },
                            debitAccount: { id: 'to-account', name: 'Bank' },
                        },
                    },
                },
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ result: 'Created draft: 20% of Original sale - 20.00' });
        expect(apiRequests).toHaveLength(1);
        expect(apiRequests[0].url).toStartWith(
            'https://api.bkper.app/v5/books/book-1/transactions'
        );
        expect(apiRequests[0].method).toBe('POST');
        expect(apiRequests[0].headers.get('bkper-oauth-token')).toBeNull();
        expect(apiRequests[0].headers.get('bkper-agent-id')).toBeNull();

        const payload = await apiRequests[0].clone().json();
        expect(payload).toMatchObject({
            date: '2026-05-27',
            amount: '20',
            description: '20% of Original sale',
            creditAccount: { id: 'from-account', name: 'Sales' },
            debitAccount: { id: 'to-account', name: 'Bank' },
        });
    });
});
