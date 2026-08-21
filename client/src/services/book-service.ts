import { Bkper, type Config } from 'bkper-js';
import { createAppApi, type AppApi, type BalanceSummary } from '../api/app-api';
import type { AuthProvider } from '../auth/auth-session';

export interface UserProfile {
    displayName: string;
}

export interface BookListItem {
    id: string;
    name: string;
}

export type { BalanceSummary } from '../api/app-api';

export interface BookBalancesView {
    book: BookListItem;
    balances: BalanceSummary[];
}

export interface BrowserBkperUser {
    getName(): string | undefined;
    getFullName(): string | undefined;
}

export interface BrowserBkperBook {
    getId(): string;
    getName(): string | undefined;
}

export interface BrowserBkperClient {
    getUser(): Promise<BrowserBkperUser>;
    getBooks(): Promise<BrowserBkperBook[]>;
}

export interface BookService {
    getCurrentUser(): Promise<UserProfile>;
    listBooksDirect(): Promise<BookListItem[]>;
    getBookBalances(bookId: string): Promise<BookBalancesView>;
}

export interface BookServiceOptions {
    auth: AuthProvider;
    bkper?: BrowserBkperClient;
    appApi?: AppApi;
}

const UNTITLED_BOOK_NAME = 'Untitled book';

export function createBkperClientConfig(auth: AuthProvider): Config {
    return {
        oauthTokenProvider: async () => auth.getAccessToken(),
        requestRetryHandler: async (status, _error, attempt) => {
            if (status === 403 && attempt === 1) {
                await auth.refresh();
            }
        },
    };
}

export function createBookService(options: BookServiceOptions): BookService {
    const bkper = options.bkper ?? new Bkper(createBkperClientConfig(options.auth));
    const appApi =
        options.appApi ??
        createAppApi({
            baseUrl: window.location.origin,
            fetch: request => options.auth.authenticatedFetch(request),
        });

    return {
        async getCurrentUser(): Promise<UserProfile> {
            const user = await bkper.getUser();
            return {
                displayName: user.getName() || user.getFullName() || 'there',
            };
        },

        async listBooksDirect(): Promise<BookListItem[]> {
            const books = await bkper.getBooks();
            return books.map(toBookListItem);
        },

        async getBookBalances(bookId: string): Promise<BookBalancesView> {
            const payload = await appApi.getBookBalances(bookId);
            return {
                book: {
                    id: payload.book.id ?? bookId,
                    name: payload.book.name ?? UNTITLED_BOOK_NAME,
                },
                balances: payload.balances,
            };
        },
    };
}

function toBookListItem(book: BrowserBkperBook): BookListItem {
    return {
        id: book.getId(),
        name: book.getName() ?? UNTITLED_BOOK_NAME,
    };
}
