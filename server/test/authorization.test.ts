import { describe, expect, it } from 'vitest';
import { Book, Permission } from 'bkper-js';
import { HTTPException } from 'hono/http-exception';
import { requireViewPermission } from '../src/api/authorization';

const cases = [
    { permission: Permission.OWNER, allowed: true },
    { permission: Permission.EDITOR, allowed: true },
    { permission: Permission.POSTER, allowed: true },
    { permission: Permission.VIEWER, allowed: true },
    { permission: Permission.RECORDER, allowed: false },
    { permission: Permission.NONE, allowed: false },
    { permission: undefined, allowed: false },
] as const;

describe('Book authorization', () => {
    it('allows only permissions that can view balances', () => {
        for (const { permission, allowed } of cases) {
            const book = new Book({ permission });

            if (allowed) {
                expect(() => requireViewPermission(book)).not.toThrow();
            } else {
                expect(() => requireViewPermission(book)).toThrow(HTTPException);
            }
        }
    });

    it('returns a useful forbidden error', () => {
        const action = () => requireViewPermission(new Book({ permission: Permission.RECORDER }));

        expect(action).toThrowError(
            expect.objectContaining({
                status: 403,
                message:
                    'Required Book permission: VIEWER, POSTER, EDITOR, or OWNER. Current: RECORDER.',
            })
        );
    });
});
