import { describe, expect, it } from 'bun:test';
import { createBearerAuthHeaders } from '../src/auth-headers';

describe('createBearerAuthHeaders', () => {
    it('builds an Authorization Bearer header', () => {
        expect(createBearerAuthHeaders(' token-123 ')).toEqual({
            Authorization: 'Bearer token-123',
        });
    });

    it('requires an access token', () => {
        expect(() => createBearerAuthHeaders(undefined)).toThrow('Missing access token');
    });
});
