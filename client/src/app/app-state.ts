import type { BalanceContainerItem, BookListItem } from '../services/book-service';

export interface AppState {
    loading: boolean;
    appError: string | null;
    userDisplayName: string;
    books: BookListItem[];
    bookName: string | null;
    selectedBookError: string | null;
    balanceContainers: BalanceContainerItem[];
    bookId: string | null;
}

export function createInitialAppState(): AppState {
    return {
        loading: true,
        appError: null,
        userDisplayName: '',
        books: [],
        bookName: null,
        selectedBookError: null,
        balanceContainers: [],
        bookId: null,
    };
}
