import type { BalanceContainerItem, BookListItem } from '../services/book-service';

export interface AppState {
    loading: boolean;
    userDisplayName: string;
    books: BookListItem[];
    serverBooks: BookListItem[];
    serverBooksError: string | null;
    bookName: string | null;
    selectedBookError: string | null;
    balanceContainers: BalanceContainerItem[];
    bookId: string | null;
}

export function createInitialAppState(): AppState {
    return {
        loading: true,
        userDisplayName: '',
        books: [],
        serverBooks: [],
        serverBooksError: null,
        bookName: null,
        selectedBookError: null,
        balanceContainers: [],
        bookId: null,
    };
}
