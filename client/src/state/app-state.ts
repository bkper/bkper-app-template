import {
    createAuthSession,
    type AuthSession,
    type AuthSessionCallbacks,
} from '../auth/auth-session';
import { createBookService, type BookService } from '../services/book-service';
import { Books } from './books';
import { Navigation, Route, type RoutePage } from './route';

export interface AppStateOptions {
    page?: RoutePage;
    embedded?: boolean;
    createAuthSession?: (callbacks: AuthSessionCallbacks) => AuthSession;
    createBookService?: (auth: AuthSession) => BookService;
    logger?: Pick<Console, 'error'>;
}

/** Creates the app's stores and wires them together. Components get it as their `state`. */
export class AppState {
    readonly route: Route;
    readonly books: Books;
    private readonly auth: AuthSession;
    private started = false;

    constructor(options: AppStateOptions = {}) {
        const page = options.page ?? window;
        this.route = new Route(page, options.embedded ?? window.parent !== window);
        this.auth = (options.createAuthSession ?? createAuthSession)({
            onLoginSuccess: () => this.books.load(),
            onError: error => this.books.fail('Auth error:', error),
        });
        const bookService = (options.createBookService ?? createService)(this.auth);
        this.books = new Books(bookService, this.route, options.logger ?? console);
        // Back or Forward shows what the URL selects.
        this.route.addEventListener('navigate', event => {
            if (event instanceof Navigation) void this.books.select(event.bookId);
        });
    }

    /** Follow Back and Forward, and sign in the first time. */
    connect(): void {
        this.route.connect();
        if (this.started) return;
        this.started = true;
        this.auth.init().catch(error => this.books.fail('Auth error:', error));
    }
    disconnect(): void {
        this.route.disconnect();
    }
}

function createService(auth: AuthSession): BookService {
    return createBookService({ auth });
}
