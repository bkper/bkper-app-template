import createClient from 'openapi-fetch';
import { createBearerAuthHeaders } from './auth-headers';
import type { components, paths } from './generated/types';

export type BookSummary = components['schemas']['BookSummary'];
export type BalanceContainer = components['schemas']['BalanceContainer'];
export type BookBalancesResponse = components['schemas']['BookBalancesResponse'];
export type PingResponse = components['schemas']['PingResponse'];
export type ApiErrorCode = components['schemas']['ApiErrorCode'];
export type ApiErrorResponse = components['schemas']['ErrorResponse'];

export interface AppApiOptions {
    getAccessToken: () => string | undefined;
    baseUrl?: string;
    fetch?: (input: Request) => Promise<Response>;
}

export class AppApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly code?: ApiErrorCode
    ) {
        super(message);
        this.name = 'AppApiError';
    }
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function readApiErrorResponse(value: unknown): ApiErrorResponse | undefined {
    if (!isObject(value) || value.success !== false || !isObject(value.error)) {
        return undefined;
    }

    const code = value.error.code;
    const message = value.error.message;
    if (typeof code !== 'string' || typeof message !== 'string') {
        return undefined;
    }

    if (code.trim().length === 0) {
        return undefined;
    }

    return {
        success: false,
        error: { code, message },
    };
}

function toAppApiError(error: unknown, response: Response): AppApiError {
    const apiError = readApiErrorResponse(error);
    if (apiError) {
        return new AppApiError(apiError.error.message, response.status, apiError.error.code);
    }

    return new AppApiError(`Server API returned ${response.status}`, response.status);
}

function requireData<T>(data: T | undefined, response: Response): T {
    if (data === undefined) {
        throw new AppApiError(
            `Server API returned empty ${response.status} response`,
            response.status
        );
    }
    return data;
}

export function createAppApi(options: AppApiOptions) {
    const client = createClient<paths>({
        baseUrl: options.baseUrl,
        fetch: options.fetch,
    });

    const getHeaders = () => createBearerAuthHeaders(options.getAccessToken());

    return {
        async ping(): Promise<PingResponse> {
            const { data, error, response } = await client.GET('/api/ping');
            if (error) {
                throw toAppApiError(error, response);
            }
            return requireData(data, response);
        },

        async getBooks(): Promise<BookSummary[]> {
            const { data, error, response } = await client.GET('/api/books', {
                headers: getHeaders(),
            });
            if (error) {
                throw toAppApiError(error, response);
            }
            return requireData(data, response).books;
        },

        async getBookBalances(bookId: string): Promise<BookBalancesResponse> {
            const { data, error, response } = await client.GET('/api/books/{bookId}/balances', {
                params: { path: { bookId } },
                headers: getHeaders(),
            });
            if (error) {
                throw toAppApiError(error, response);
            }
            return requireData(data, response);
        },
    };
}

export type AppApi = ReturnType<typeof createAppApi>;
