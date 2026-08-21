import { z } from '@hono/zod-openapi';
import type { ZodType } from 'zod';

const JSON_CONTENT_TYPE = 'application/json';

export function jsonResponse<TSchema extends ZodType>(description: string, schema: TSchema) {
    return {
        description,
        content: {
            [JSON_CONTENT_TYPE]: { schema },
        },
    };
}

export const ErrorResponseSchema = z
    .object({
        success: z.literal(false),
        error: z.object({
            code: z.string().min(1).openapi({ example: 'INTERNAL_ERROR' }),
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

// Bkper owns and validates its API payload. This schema documents a trusted response;
// request bodies still require concrete Zod validation.
export const BookSchema = z
    .custom<bkper.Book>(value => value !== undefined)
    .openapi('Book', {
        type: 'object',
        additionalProperties: true,
        'x-typescript-type': 'bkper.Book',
    });

export const BalanceSummarySchema = z
    .object({
        name: z.string().openapi({ example: 'Cash' }),
        cumulativeBalanceText: z.string().openapi({ example: '1,234.56' }),
    })
    .openapi('BalanceSummary');

export const BookBalancesResponseSchema = z
    .object({
        book: BookSchema,
        balances: z.array(BalanceSummarySchema),
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
    400: jsonResponse('Invalid request', ErrorResponseSchema),
    401: jsonResponse('Authentication failed', ErrorResponseSchema),
    403: jsonResponse('Permission denied', ErrorResponseSchema),
    500: jsonResponse('Unexpected API error', ErrorResponseSchema),
    default: jsonResponse('Bkper API error', ErrorResponseSchema),
};
