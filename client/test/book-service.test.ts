import { describe, expect, it } from 'vitest';
import { createBkperClientConfig, createBookService } from '../src/services/book-service';
import type { AppApi } from '../src/api/app-api';
import type { BrowserBkperClient } from '../src/services/book-service';

function createAppApiStub(overrides: Partial<AppApi> = {}): AppApi {
    return {
        ping: async () => ({ ok: true, source: 'test' }),
        getBookBalances: async bookId => ({
            book: { id: bookId, name: 'Test Book' },
            balances: [],
        }),
        ...overrides,
    };
}

describe('createBookService', () => {
    it('wires token refresh into the bkper-js client config', async () => {
        let refreshCalls = 0;
        const config = createBkperClientConfig({
            authenticatedFetch: async () => new Response(),
            getAccessToken: () => 'token-123',
            refresh: async () => {
                refreshCalls += 1;
            },
        });

        await expect(config.oauthTokenProvider?.()).resolves.toBe('token-123');
        await config.requestRetryHandler?.(403, undefined, 1);
        await config.requestRetryHandler?.(403, undefined, 2);
        await config.requestRetryHandler?.(500, undefined, 1);

        expect(refreshCalls).toBe(1);
    });

    it('uses authenticated fetch for server API requests', async () => {
        const requests: Request[] = [];
        const service = createBookService({
            auth: {
                authenticatedFetch: async input => {
                    requests.push(new Request(input));
                    return new Response(
                        JSON.stringify({
                            book: { id: 'book-1', name: 'Main Book' },
                            balances: [],
                        }),
                        { headers: { 'content-type': 'application/json' } }
                    );
                },
                getAccessToken: () => 'token-123',
                refresh: async () => undefined,
            },
            bkper: {
                getUser: async () => ({ getName: () => 'Ada', getFullName: () => 'Ada' }),
                getBooks: async () => [],
            },
        });

        await expect(service.getBookBalances('book-1')).resolves.toEqual({
            book: { id: 'book-1', name: 'Main Book' },
            balances: [],
        });
        expect(requests[0].url).toBe('http://localhost:5173/api/v1/books/book-1/balances');
    });

    it('maps bkper-js user and books into component-ready data', async () => {
        const bkper: BrowserBkperClient = {
            getUser: async () => ({
                getName: () => '',
                getFullName: () => 'Ada Lovelace',
            }),
            getBooks: async () => [
                { getId: () => 'book-1', getName: () => 'Main Book' },
                { getId: () => 'book-2', getName: () => undefined },
            ],
        };

        const service = createBookService({
            auth: {
                authenticatedFetch: async () => new Response(),
                getAccessToken: () => 'token-123',
                refresh: async () => undefined,
            },
            bkper,
            appApi: createAppApiStub(),
        });

        await expect(service.getCurrentUser()).resolves.toEqual({
            displayName: 'Ada Lovelace',
        });
        await expect(service.listBooksDirect()).resolves.toEqual([
            { id: 'book-1', name: 'Main Book' },
            { id: 'book-2', name: 'Untitled book' },
        ]);
    });

    it('keeps balance API data behind the service contract', async () => {
        const service = createBookService({
            auth: {
                authenticatedFetch: async () => new Response(),
                getAccessToken: () => 'token-123',
                refresh: async () => undefined,
            },
            bkper: {
                getUser: async () => ({ getName: () => 'Ada', getFullName: () => 'Ada Lovelace' }),
                getBooks: async () => [],
            },
            appApi: createAppApiStub({
                getBookBalances: async () => ({
                    book: { id: 'book-1', name: 'Main Book' },
                    balances: [{ name: 'Cash', cumulativeBalanceText: '10.00' }],
                }),
            }),
        });

        await expect(service.getBookBalances('book-1')).resolves.toEqual({
            book: { id: 'book-1', name: 'Main Book' },
            balances: [{ name: 'Cash', cumulativeBalanceText: '10.00' }],
        });
    });
});
