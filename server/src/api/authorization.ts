import { Permission, type Book } from 'bkper-js';
import { HTTPException } from 'hono/http-exception';

const VIEW_PERMISSIONS: readonly Permission[] = [
    Permission.VIEWER,
    Permission.POSTER,
    Permission.EDITOR,
    Permission.OWNER,
];

export function requireViewPermission(book: Book): void {
    const permission = book.getPermission();
    if (!VIEW_PERMISSIONS.includes(permission)) {
        throw new HTTPException(403, {
            message: `Required Book permission: VIEWER, POSTER, EDITOR, or OWNER. Current: ${permission ?? 'unavailable'}.`,
        });
    }
}
