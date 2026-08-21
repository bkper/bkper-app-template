import createClient from 'openapi-fetch';
import type {
    BalanceSummary,
    BookBalancesResponse,
    ErrorResponse,
    paths,
    PingResponse,
} from './generated/types';

export type { BalanceSummary, BookBalancesResponse, PingResponse };
export type ApiErrorResponse = ErrorResponse;

export interface AppApiOptions {
    baseUrl?: string;
    fetch: (input: Request) => Promise<Response>;
}

export class AppApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly code?: string
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

    return {
        async ping(): Promise<PingResponse> {
            const { data, error, response } = await client.GET('/api/v1/ping');
            if (error) {
                throw toAppApiError(error, response);
            }
            return requireData(data, response);
        },

        async getBookBalances(bookId: string): Promise<BookBalancesResponse> {
            const { data, error, response } = await client.GET('/api/v1/books/{bookId}/balances', {
                params: { path: { bookId } },
            });
            if (error) {
                throw toAppApiError(error, response);
            }
            return requireData(data, response);
        },
    };
}

export type AppApi = ReturnType<typeof createAppApi>;
