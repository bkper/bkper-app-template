import { z } from '@hono/zod-openapi';

export const ApiErrorCodeSchema = z.string().min(1).openapi('ApiErrorCode');

export const ErrorResponseSchema = z
    .object({
        success: z.literal(false),
        error: z.object({
            code: ApiErrorCodeSchema.openapi({ example: 'INTERNAL_ERROR' }),
            message: z.string().openapi({ example: 'An unexpected error occurred' }),
        }),
    })
    .openapi('ErrorResponse');

export const PingResponseSchema = z
    .object({
        ok: z.boolean().openapi({ example: true }),
        source: z.string().openapi({ example: 'my-app' }),
    })
    .openapi('PingResponse');

export const BookSummarySchema = z
    .object({
        id: z.string().openapi({ example: 'book_123' }),
        name: z.string().openapi({ example: 'Main Book' }),
    })
    .openapi('BookSummary');

export const BooksResponseSchema = z
    .object({
        books: z.array(BookSummarySchema),
    })
    .openapi('BooksResponse');

export const BalanceContainerSchema = z
    .object({
        name: z.string().openapi({ example: 'Cash' }),
        cumulativeBalanceText: z.string().openapi({ example: '1,234.56' }),
    })
    .openapi('BalanceContainer');

export const BookBalancesResponseSchema = z
    .object({
        book: BookSummarySchema,
        balances: z.array(BalanceContainerSchema),
    })
    .openapi('BookBalancesResponse');

export const BookIdParamSchema = z.object({
    bookId: z
        .string()
        .min(1)
        .openapi({
            param: { name: 'bookId', in: 'path' },
            example: 'book_123',
            description: 'Bkper book ID',
        }),
});

export const apiErrorResponses = {
    400: {
        description: 'Invalid request',
        content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
        description: 'Authentication failed',
        content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
        description: 'Permission denied',
        content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
        description: 'Unexpected API error',
        content: { 'application/json': { schema: ErrorResponseSchema } },
    },
};
