export type ApiErrorCode = string;

export function buildApiError(code: ApiErrorCode, message: string) {
    return {
        success: false as const,
        error: { code, message },
    };
}
