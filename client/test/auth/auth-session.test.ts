import { describe, expect, it } from 'vitest';
import { isLocalDevelopmentHost } from '../../src/auth/auth-session';

describe('isLocalDevelopmentHost', () => {
    it('recognizes localhost development hosts', () => {
        expect(isLocalDevelopmentHost('localhost')).toBe(true);
        expect(isLocalDevelopmentHost('127.0.0.1')).toBe(true);
        expect(isLocalDevelopmentHost('my-app.bkper.app')).toBe(false);
    });
});
