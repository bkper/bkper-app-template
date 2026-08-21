import { describe, expect, it } from 'vitest';
import { AppApiError, createAppApi } from '../src/api/app-api';

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

describe('createAppApi', () => {
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
                        error: { code: 'BALANCES_FAILED', message: 'Could not load balances' },
                    },
                    500
                ),
        });

        await expect(api.getBookBalances('book-1')).rejects.toThrow('Could not load balances');

        try {
            await api.getBookBalances('book-1');
            throw new Error('Expected getBookBalances to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(AppApiError);
            if (error instanceof AppApiError) {
                expect(error.status).toBe(500);
                expect(error.code).toBe('BALANCES_FAILED');
            }
        }
    });
});
