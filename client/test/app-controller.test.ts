import { describe, expect, it } from 'vitest';
import { AppController } from '../src/app/app-controller';
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { AuthSession, AuthSessionCallbacks } from '../src/auth/auth-session';
import type { BookService } from '../src/services/book-service';

class TestHost implements ReactiveControllerHost {
    readonly updateComplete = Promise.resolve(true);
    readonly controllers: ReactiveController[] = [];
    updateCount = 0;

    addController(controller: ReactiveController): void {
        this.controllers.push(controller);
    }

    removeController(controller: ReactiveController): void {
        const index = this.controllers.indexOf(controller);
        if (index >= 0) {
            this.controllers.splice(index, 1);
        }
    }

    requestUpdate(): void {
        this.updateCount += 1;
    }
}

function createAuth(): AuthSession {
    return {
        authenticatedFetch: async () => new Response(),
        getAccessToken: () => 'token-123',
        init: async () => undefined,
        login: () => undefined,
        refresh: async () => undefined,
    };
}

function createBookService(overrides: Partial<BookService> = {}): BookService {
    return {
        getCurrentUser: async () => ({ displayName: 'Ada Lovelace' }),
        listBooksDirect: async () => [{ id: 'book-1', name: 'Main Book' }],
        listBooksFromServer: async () => [{ id: 'book-2', name: 'Server Book' }],
        getBookBalances: async bookId => ({
            book: { id: bookId, name: 'Selected Book' },
            balances: [{ name: 'Cash', cumulativeBalanceText: '10.00' }],
        }),
        ...overrides,
    };
}

describe('AppController', () => {
    it('loads book picker state after authentication succeeds', async () => {
        const host = new TestHost();
        const authRef: { callbacks?: AuthSessionCallbacks } = {};
        const controller = new AppController(host, {
            getSearch: () => '',
            createAuthSession: callbacks => {
                authRef.callbacks = callbacks;
                return createAuth();
            },
            createBookService: () => createBookService(),
            logger: { error: () => undefined },
            navigate: () => undefined,
        });

        await controller.initialize();
        await authRef.callbacks?.onLoginSuccess?.();

        expect(controller.state.loading).toBe(false);
        expect(controller.state.userDisplayName).toBe('Ada Lovelace');
        expect(controller.state.books).toEqual([{ id: 'book-1', name: 'Main Book' }]);
        expect(controller.state.serverBooks).toEqual([{ id: 'book-2', name: 'Server Book' }]);
    });

    it('loads selected book balances when bookId is present in the URL', async () => {
        const host = new TestHost();
        const authRef: { callbacks?: AuthSessionCallbacks } = {};
        const controller = new AppController(host, {
            getSearch: () => '?bookId=book-1',
            createAuthSession: callbacks => {
                authRef.callbacks = callbacks;
                return createAuth();
            },
            createBookService: () => createBookService(),
            logger: { error: () => undefined },
            navigate: () => undefined,
        });

        await controller.initialize();
        await authRef.callbacks?.onLoginSuccess?.();

        expect(controller.state.bookId).toBe('book-1');
        expect(controller.state.bookName).toBe('Selected Book');
        expect(controller.state.balanceContainers).toEqual([
            { name: 'Cash', cumulativeBalanceText: '10.00' },
        ]);
    });

    it('navigates through the controller instead of the component', () => {
        const host = new TestHost();
        const navigations: string[] = [];
        const controller = new AppController(host, {
            getSearch: () => '',
            createAuthSession: () => ({
                authenticatedFetch: async () => new Response(),
                getAccessToken: () => 'token-123',
                init: async () => undefined,
                login: () => undefined,
                refresh: async () => undefined,
            }),
            createBookService: () => createBookService(),
            logger: { error: () => undefined },
            navigate: href => navigations.push(href),
        });

        controller.selectBook('book 1');

        expect(navigations).toEqual(['?bookId=book+1']);
    });
});
