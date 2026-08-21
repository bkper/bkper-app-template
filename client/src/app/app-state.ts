import type { BalanceContainerItem, BookListItem } from '../services/book-service';

export interface AppState {
    loading: boolean;
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
        userDisplayName: '',
        books: [],
        bookName: null,
        selectedBookError: null,
        balanceContainers: [],
        bookId: null,
    };
}
