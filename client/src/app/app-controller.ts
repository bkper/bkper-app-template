import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
    createAuthSession,
    type AccessTokenProvider,
    type AuthSession,
    type AuthSessionCallbacks,
} from '../auth/auth-session';
import { createBookService, type BookService } from '../services/book-service';
import { createInitialAppState, type AppState } from './app-state';

export interface AppControllerOptions {
    createAuthSession?: (callbacks: AuthSessionCallbacks) => AuthSession;
    createBookService?: (accessTokenProvider: AccessTokenProvider) => BookService;
    getSearch?: () => string;
    navigate?: (href: string) => void;
    logger?: Pick<Console, 'error'>;
}

export class AppController implements ReactiveController {
    state: AppState = createInitialAppState();

    private readonly auth: AuthSession;
    private readonly bookService: BookService;
    private readonly getSearch: () => string;
    private readonly navigate: (href: string) => void;
    private readonly logger: Pick<Console, 'error'>;

    constructor(
        private readonly host: ReactiveControllerHost,
        options: AppControllerOptions = {}
    ) {
        this.host.addController(this);
        this.getSearch = options.getSearch ?? (() => window.location.search);
        this.navigate =
            options.navigate ??
            (href => {
                window.location.href = href;
            });
        this.logger = options.logger ?? console;

        const authFactory = options.createAuthSession ?? createAuthSession;
        const bookServiceFactory =
            options.createBookService ??
            (accessTokenProvider => createBookService({ accessTokenProvider }));

        this.auth = authFactory({
            onLoginSuccess: () => this.loadData(),
            onError: error => {
                this.logger.error('Auth error:', error);
            },
        });
        this.bookService = bookServiceFactory(this.auth);
    }

    hostConnected(): void {
        void this.initialize();
    }

    async initialize(): Promise<void> {
        this.setState({ bookId: getBookIdFromSearch(this.getSearch()) });
        await this.auth.init();
    }

    selectBook(bookId: string): void {
        const params = new URLSearchParams();
        params.set('bookId', bookId);
        this.navigate(`?${params.toString()}`);
    }

    private async loadData(): Promise<void> {
        this.setState({ loading: true });

        try {
            const user = await this.bookService.getCurrentUser();
            this.setState({ userDisplayName: user.displayName });

            if (this.state.bookId) {
                await this.loadBook(this.state.bookId);
            } else {
                this.setState({ books: await this.bookService.listBooksDirect() });
                await this.loadServerBooks();
            }
        } catch (error) {
            this.logger.error('Error loading data:', error);
        } finally {
            this.setState({ loading: false });
        }
    }

    private async loadBook(bookId: string): Promise<void> {
        this.setState({
            selectedBookError: null,
            bookName: null,
            balanceContainers: [],
        });

        try {
            const payload = await this.bookService.getBookBalances(bookId);
            this.setState({
                bookName: payload.book.name,
                balanceContainers: payload.balances,
            });
        } catch (error) {
            this.logger.error('Error loading book from server API:', error);
            this.setState({ selectedBookError: toErrorMessage(error) });
        }
    }

    private async loadServerBooks(): Promise<void> {
        this.setState({ serverBooksError: null });

        try {
            this.setState({ serverBooks: await this.bookService.listBooksFromServer() });
        } catch (error) {
            this.logger.error('Error loading books from server API:', error);
            this.setState({
                serverBooksError: toErrorMessage(error),
                serverBooks: [],
            });
        }
    }

    private setState(patch: Partial<AppState>): void {
        this.state = { ...this.state, ...patch };
        this.host.requestUpdate();
    }
}

function getBookIdFromSearch(search: string): string | null {
    return new URLSearchParams(search).get('bookId');
}

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
