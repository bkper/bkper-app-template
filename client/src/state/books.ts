import type { BalanceSummary, BookListItem, BookService } from '../services/book-service';
import type { Route } from './route';
import { reactive, Store } from './store';

const INITIAL_DATA_ERROR = 'Could not load your Bkper data. Please reload and try again.';

/**
 * The signed-in person's Books and the selected Book's balances. The route says which Book is
 * selected; `select` changes it and loads what it shows.
 */
export class Books extends Store {
    @reactive loading = true;
    @reactive appError: string | null = null;
    @reactive userDisplayName = '';
    @reactive books: BookListItem[] = [];
    @reactive bookName: string | null = null;
    @reactive selectedBookError: string | null = null;
    @reactive balanceContainers: BalanceSummary[] = [];
    private listed = false;

    constructor(
        private readonly bookService: BookService,
        private readonly route: Route,
        private readonly logger: Pick<Console, 'error'>
    ) {
        super();
    }

    /** Load the person and what the URL selects, once signed in. */
    async load(): Promise<void> {
        this.loading = true;
        this.appError = null;
        try {
            const user = await this.bookService.getCurrentUser();
            this.userDisplayName = user.displayName;
            await this.show();
        } catch (error) {
            this.fail('Error loading data:', error);
        } finally {
            this.loading = false;
        }
    }

    /** Select a Book, or none for the Book list, and show it. */
    async select(bookId: string | undefined): Promise<void> {
        this.route.select(bookId);
        try {
            await this.show();
        } catch (error) {
            this.fail('Error loading data:', error);
        }
    }

    /** Nothing can load, such as when authentication fails. Shows a safe message, never the error. */
    fail(message: string, error: unknown): void {
        this.logger.error(message, error);
        this.loading = false;
        this.appError = INITIAL_DATA_ERROR;
    }

    /** Load what the route selects, showing the loading state until the latest selection answers. */
    private async show(): Promise<void> {
        const bookId = this.route.bookId;
        if (!bookId && this.listed) return;
        this.loading = true;
        try {
            if (bookId) return await this.loadBook(bookId);
            this.books = await this.bookService.listBooksDirect();
            this.listed = true;
        } finally {
            if (this.route.bookId === bookId) this.loading = false;
        }
    }

    private async loadBook(bookId: string): Promise<void> {
        this.selectedBookError = null;
        this.bookName = null;
        this.balanceContainers = [];
        try {
            const payload = await this.bookService.getBookBalances(bookId);
            // Another Book may have been selected meanwhile; it shows its own.
            if (this.route.bookId !== bookId) return;
            this.bookName = payload.book.name;
            this.balanceContainers = payload.balances;
        } catch (error) {
            if (this.route.bookId !== bookId) return;
            this.logger.error('Error loading book from server API:', error);
            this.selectedBookError = toErrorMessage(error);
        }
    }
}

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
