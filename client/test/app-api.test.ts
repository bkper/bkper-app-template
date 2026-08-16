import { describe, expect, it } from 'vitest';
import { AppApiError, createAppApi } from '../src/api/app-api';

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

describe('createAppApi', () => {
    it('loads books through the provided fetch implementation', async () => {
        const requests: Request[] = [];
        const api = createAppApi({
            baseUrl: 'https://app.example.test',
            fetch: async request => {
                requests.push(request);
                return jsonResponse({ books: [{ id: 'book-1', name: 'Main Book' }] });
            },
        });

        const books = await api.getBooks();

        expect(books).toEqual([{ id: 'book-1', name: 'Main Book' }]);
        expect(requests).toHaveLength(1);
        expect(requests[0].url).toBe('https://app.example.test/api/v1/books');
    });

    it('loads book balances using a typed path parameter', async () => {
        const requests: Request[] = [];
        const api = createAppApi({
            baseUrl: 'https://app.example.test',
            fetch: async request => {
                requests.push(request);
                return jsonResponse({
                    book: { id: 'book 1', name: 'Main Book' },
                    balances: [{ name: 'Cash', cumulativeBalanceText: '10.00' }],
                });
            },
        });

        const result = await api.getBookBalances('book 1');

        expect(result).toEqual({
            book: { id: 'book 1', name: 'Main Book' },
            balances: [{ name: 'Cash', cumulativeBalanceText: '10.00' }],
        });
        expect(requests[0].url).toBe('https://app.example.test/api/v1/books/book%201/balances');
    });

    it('throws a normalized API error', async () => {
        const api = createAppApi({
            baseUrl: 'https://app.example.test',
            fetch: async () =>
                jsonResponse(
                    {
                        success: false,
                        error: { code: 'BOOKS_FAILED', message: 'Could not load books' },
                    },
                    500
                ),
        });

        await expect(api.getBooks()).rejects.toThrow('Could not load books');

        try {
            await api.getBooks();
            throw new Error('Expected getBooks to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(AppApiError);
            if (error instanceof AppApiError) {
                expect(error.status).toBe(500);
                expect(error.code).toBe('BOOKS_FAILED');
            }
        }
    });
});
