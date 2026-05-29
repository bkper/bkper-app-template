import { describe, expect, it } from 'bun:test';
import { createBookService } from '../src/services/book-service';
import type { AppApi } from '../src/api/app-api';
import type { BrowserBkperClient } from '../src/services/book-service';

function createAppApiStub(overrides: Partial<AppApi> = {}): AppApi {
    return {
        ping: async () => ({ ok: true, source: 'test' }),
        getBooks: async () => [],
        getBookBalances: async bookId => ({ book: { id: bookId, name: 'Test Book' }, balances: [] }),
        ...overrides,
    };
}

describe('createBookService', () => {
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
            accessTokenProvider: { getAccessToken: () => 'token-123' },
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

    it('keeps server API data behind the service contract', async () => {
        const service = createBookService({
            accessTokenProvider: { getAccessToken: () => 'token-123' },
            bkper: {
                getUser: async () => ({ getName: () => 'Ada', getFullName: () => 'Ada Lovelace' }),
                getBooks: async () => [],
            },
            appApi: createAppApiStub({
                getBooks: async () => [{ id: 'book-1', name: 'Main Book' }],
                getBookBalances: async () => ({
                    book: { id: 'book-1', name: 'Main Book' },
                    balances: [{ name: 'Cash', cumulativeBalanceText: '10.00' }],
                }),
            }),
        });

        await expect(service.listBooksFromServer()).resolves.toEqual([
            { id: 'book-1', name: 'Main Book' },
        ]);
        await expect(service.getBookBalances('book-1')).resolves.toEqual({
            book: { id: 'book-1', name: 'Main Book' },
            balances: [{ name: 'Cash', cumulativeBalanceText: '10.00' }],
        });
    });
});
