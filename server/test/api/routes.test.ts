import { describe, expect, it } from 'vitest';
import { Bkper, BkperError, Book, Permission } from 'bkper-js';
import type { Config } from 'bkper-js';
import { AppContext, type AppContextFactory } from '../../src/app-context';
import app, { createApp } from '../../src/index';
import { createTestEnv } from '../test-env';

interface BalanceSummaryStub {
    name: string;
    cumulativeBalanceText: string;
}

function createBookStub(options: {
    id: string;
    name: string;
    balances?: BalanceSummaryStub[];
    permission?: Permission;
}): Book {
    const permission = options.permission ?? Permission.VIEWER;
    return {
        getId: () => options.id,
        getName: () => options.name,
        getPermission: () => permission,
        json: () => ({ id: options.id, name: options.name, permission }),
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

describe('app API routes', () => {
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
            book: { id: 'book-1', name: 'Main Book', permission: Permission.VIEWER },
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
});
