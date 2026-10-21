import { describe, expect, it, vi } from 'vitest';
import type { AuthSession, AuthSessionCallbacks } from '../../src/auth/auth-session';
import type { BookBalancesView, BookService } from '../../src/services/book-service';
import { AppState } from '../../src/state/app-state';
import type { RoutePage } from '../../src/state/route';

const SAFE_ERROR = 'Could not load your Bkper data. Please reload and try again.';

function createPage(href: string) {
    const listeners = new Set<() => void>();
    const page: RoutePage = {
        location: { href },
        history: {
            state: null,
            pushState: (_data, _unused, url) => void (page.location.href = String(url)),
            replaceState: (_data, _unused, url) => void (page.location.href = String(url)),
        },
        addEventListener: (_type, listener) => listeners.add(listener),
        removeEventListener: (_type, listener) => listeners.delete(listener),
    };
    const goTo = (url: string) => {
        page.location.href = url;
        for (const listener of listeners) listener();
    };
    return { page, goTo };
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
        getBookBalances: async bookId => ({
            book: { id: bookId, name: `Book ${bookId}` },
            balances: [{ name: 'Cash', cumulativeBalanceText: '10.00' }],
        }),
        ...overrides,
    };
}

/** An app at `href`, signed in once `signIn` runs. */
function createApp(href: string, bookService = createBookService()) {
    const { page, goTo } = createPage(href);
    const auth: { callbacks?: AuthSessionCallbacks } = {};
    const state = new AppState({
        page,
        embedded: false,
        createAuthSession: callbacks => {
            auth.callbacks = callbacks;
            return createAuth();
        },
        createBookService: () => bookService,
        logger: { error: () => undefined },
    });
    state.connect();
    const signIn = async () => auth.callbacks?.onLoginSuccess?.();
    return { state, page, goTo, signIn, auth };
}

describe('AppState', () => {
    it('loads the Book picker after authentication succeeds', async () => {
        const { state, signIn } = createApp('https://my-app.bkper.app/');

        await signIn();

        expect(state.books.loading).toBe(false);
        expect(state.books.userDisplayName).toBe('Ada Lovelace');
        expect(state.books.books).toEqual([{ id: 'book-1', name: 'Main Book' }]);
    });

    it('shows a safe error when initial Bkper data cannot be loaded', async () => {
        const { state, signIn } = createApp(
            'https://my-app.bkper.app/',
            createBookService({
                getCurrentUser: async () => {
                    throw new Error('Sensitive client details');
                },
            })
        );

        await signIn();

        expect(state.books.loading).toBe(false);
        expect(state.books.appError).toBe(SAFE_ERROR);
    });

    it('shows the same safe error when authentication fails', () => {
        const { state, auth } = createApp('https://my-app.bkper.app/');

        auth.callbacks?.onError?.(new Error('Sensitive auth details'));

        expect(state.books.loading).toBe(false);
        expect(state.books.appError).toBe(SAFE_ERROR);
    });

    it('loads the selected Book balances when bookId is in the URL', async () => {
        const { state, signIn } = createApp('https://my-app.bkper.app/?bookId=book-1');

        await signIn();

        expect(state.route.bookId).toBe('book-1');
        expect(state.books.bookName).toBe('Book book-1');
        expect(state.books.balanceContainers).toEqual([
            { name: 'Cash', cumulativeBalanceText: '10.00' },
        ]);
    });

    it('selecting a Book writes it to the URL and loads it without reloading the page', async () => {
        const { state, page, signIn } = createApp('https://my-app.bkper.app/');
        await signIn();

        await state.books.select('book 1');

        expect(page.location.href).toBe('https://my-app.bkper.app/?bookId=book+1');
        expect(state.books.bookName).toBe('Book book 1');
    });

    it('going back to the Book list loads the list, even when the app opened on a Book', async () => {
        const { state, signIn } = createApp('https://my-app.bkper.app/?bookId=book-1');
        await signIn();

        await state.books.select(undefined);

        expect(state.route.bookId).toBeUndefined();
        expect(state.books.books).toEqual([{ id: 'book-1', name: 'Main Book' }]);
    });

    it('Back and Forward show the Book the URL selects', async () => {
        const { state, goTo, signIn } = createApp('https://my-app.bkper.app/');
        await signIn();

        goTo('https://my-app.bkper.app/?bookId=book-2');

        expect(state.route.bookId).toBe('book-2');
        await vi.waitFor(() => expect(state.books.bookName).toBe('Book book-2'));
    });

    it('shows the loading state until the selected Book answers', async () => {
        let answer: (view: BookBalancesView) => void = () => undefined;
        const { state, signIn } = createApp(
            'https://my-app.bkper.app/',
            createBookService({
                getBookBalances: () => new Promise(resolve => (answer = resolve)),
            })
        );
        await signIn();

        const selecting = state.books.select('book-1');
        expect(state.books.loading).toBe(true);
        answer({ book: { id: 'book-1', name: 'Main Book' }, balances: [] });
        await selecting;

        expect(state.books.loading).toBe(false);
    });

    it('keeps the latest selection when an earlier Book answers last', async () => {
        const answers = new Map<string, (view: BookBalancesView) => void>();
        const { state, signIn } = createApp(
            'https://my-app.bkper.app/',
            createBookService({
                getBookBalances: bookId => new Promise(resolve => answers.set(bookId, resolve)),
            })
        );
        await signIn();

        const first = state.books.select('book-1');
        const second = state.books.select('book-2');
        answers.get('book-2')?.({ book: { id: 'book-2', name: 'Second' }, balances: [] });
        await second;
        answers.get('book-1')?.({ book: { id: 'book-1', name: 'First' }, balances: [] });
        await first;

        expect(state.books.bookName).toBe('Second');
        expect(state.books.loading).toBe(false);
    });
});
