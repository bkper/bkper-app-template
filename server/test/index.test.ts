import { afterEach, describe, expect, it } from 'vitest';
import { Bkper, BkperError, Book, Permission } from 'bkper-js';
import type { Config } from 'bkper-js';
import { AppContext, type AppContextFactory } from '../src/app-context';
import app, { createApp } from '../src/index';

interface BalanceContainerStub {
    name: string;
    cumulativeBalanceText: string;
}

function createBookStub(options: {
    id: string;
    name: string;
    balances?: BalanceContainerStub[];
    permission?: Permission;
}): Book {
    return {
        getId: () => options.id,
        getName: () => options.name,
        getPermission: () => options.permission ?? Permission.VIEWER,
        getBalancesReport: async () => ({
            getBalancesContainers: () =>
                (options.balances ?? []).map(balance => ({
                    getName: () => balance.name,
                    getCumulativeBalanceText: () => balance.cumulativeBalanceText,
                })),
        }),
    } as unknown as Book;
}

function createBkperStub(overrides: Partial<Bkper> = {}): Bkper {
    return {
        getBooks: async () => [],
        getBook: async (bookId: string) => createBookStub({ id: bookId, name: 'Test Book' }),
        getConfig: () => ({}) satisfies Config,
        ...overrides,
    } as unknown as Bkper;
}

function createContextFactory(bkper: Bkper): AppContextFactory {
    return c => new AppContext(bkper, c.env);
}

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

    it('returns a lightweight API ping without calling Bkper', async () => {
        const response = await app.request('/api/v1/ping');
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ ok: true, source: 'my-app' });
    });

    it('creates request context through middleware for app API routes', async () => {
        let contextCreations = 0;
        const testApp = createApp(c => {
            contextCreations += 1;
            return new AppContext(createBkperStub(), c.env);
        });

        const response = await testApp.request('/api/v1/ping');

        expect(response.status).toBe(200);
        expect(contextCreations).toBe(1);
    });

    it('returns book balances from an injected request context', async () => {
        const testApp = createApp(
            createContextFactory(
                createBkperStub({
                    getBook: async bookId =>
                        createBookStub({
                            id: bookId,
                            name: 'Main Book',
                            balances: [
                                { name: 'Bank', cumulativeBalanceText: '123.45' },
                                { name: 'Sales', cumulativeBalanceText: '-123.45' },
                            ],
                        }),
                })
            )
        );

        const response = await testApp.request('/api/v1/books/book-1/balances');
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({
            book: { id: 'book-1', name: 'Main Book' },
            balances: [
                { name: 'Bank', cumulativeBalanceText: '123.45' },
                { name: 'Sales', cumulativeBalanceText: '-123.45' },
            ],
        });
    });

    it('rejects balance access without view permission', async () => {
        const testApp = createApp(
            createContextFactory(
                createBkperStub({
                    getBook: async bookId =>
                        createBookStub({
                            id: bookId,
                            name: 'Recorder Book',
                            permission: Permission.RECORDER,
                        }),
                })
            )
        );

        const response = await testApp.request('/api/v1/books/book-1/balances');

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({
            success: false,
            error: {
                code: '403',
                message:
                    'Required Book permission: VIEWER, POSTER, EDITOR, or OWNER. Current: RECORDER.',
            },
        });
    });

    it('forwards controlled Bkper API errors without individual status mapping', async () => {
        const testApp = createApp(
            createContextFactory(
                createBkperStub({
                    getBook: async () => {
                        throw new BkperError(401, 'You are not a collaborator on this Book');
                    },
                })
            )
        );

        const response = await testApp.request('/api/v1/books/book-1/balances');

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            success: false,
            error: { code: '401', message: 'You are not a collaborator on this Book' },
        });
    });

    it('hides unexpected server API failure details', async () => {
        const testApp = createApp(
            createContextFactory(
                createBkperStub({
                    getBook: async () => {
                        throw new Error('Sensitive internal details');
                    },
                })
            )
        );
        const originalConsoleError = console.error;
        console.error = () => undefined;

        try {
            const response = await testApp.request('/api/v1/books/book-1/balances');
            const body = await response.json();

            expect(response.status).toBe(500);
            expect(body).toEqual({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An unexpected error occurred',
                },
            });
        } finally {
            console.error = originalConsoleError;
        }
    });

    it('does not expose live KV test endpoints', async () => {
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

        expect(writeResponse.status).toBe(404);
        expect(await writeResponse.json()).toEqual({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Route not found: POST /api/test/kv' },
        });
        expect(readResponse.status).toBe(404);
        expect(await readResponse.json()).toEqual({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Route not found: GET /api/test/kv/sample-key' },
        });
    });

    it('returns JSON 404 for unknown API routes instead of serving client assets', async () => {
        const response = await app.request('/api/missing', {}, createTestEnv());

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Route not found: GET /api/missing' },
        });
    });

    it('does not expose unversioned public API routes', async () => {
        const response = await app.request('/api/books', {}, createTestEnv());

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Route not found: GET /api/books' },
        });
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
        globalThis.fetch = async (
            input: RequestInfo | URL,
            init?: RequestInit
        ): Promise<Response> => {
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
        expect(
            apiRequests[0].url.startsWith('https://api.bkper.app/v5/books/book-1/transactions')
        ).toBe(true);
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
