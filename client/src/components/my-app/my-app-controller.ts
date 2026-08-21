import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
    createAuthSession,
    type AuthProvider,
    type AuthSession,
    type AuthSessionCallbacks,
} from '../../auth/auth-session';
import {
    createBookService,
    type BalanceContainerItem,
    type BookListItem,
    type BookService,
} from '../../services/book-service';

const INITIAL_DATA_ERROR = 'Could not load your Bkper data. Please reload and try again.';

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

export interface AppControllerOptions {
    createAuthSession?: (callbacks: AuthSessionCallbacks) => AuthSession;
    createBookService?: (auth: AuthProvider) => BookService;
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
            options.createBookService ?? (auth => createBookService({ auth }));

        this.auth = authFactory({
            onLoginSuccess: () => this.loadData(),
            onError: error => this.showInitialError('Auth error:', error),
        });
        this.bookService = bookServiceFactory(this.auth);
    }

    hostConnected(): void {
        void this.initialize();
    }

    async initialize(): Promise<void> {
        this.setState({ bookId: getBookIdFromSearch(this.getSearch()) });
        try {
            await this.auth.init();
        } catch (error) {
            this.showInitialError('Auth error:', error);
        }
    }

    selectBook(bookId: string): void {
        const params = new URLSearchParams();
        params.set('bookId', bookId);
        this.navigate(`?${params.toString()}`);
    }

    private async loadData(): Promise<void> {
        this.setState({ loading: true, appError: null });

        try {
            const user = await this.bookService.getCurrentUser();
            this.setState({ userDisplayName: user.displayName });

            if (this.state.bookId) {
                await this.loadBook(this.state.bookId);
            } else {
                this.setState({ books: await this.bookService.listBooksDirect() });
            }
        } catch (error) {
            this.showInitialError('Error loading data:', error);
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

    private showInitialError(message: string, error: unknown): void {
        this.logger.error(message, error);
        this.setState({ loading: false, appError: INITIAL_DATA_ERROR });
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
