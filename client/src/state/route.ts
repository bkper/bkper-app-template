import { reactive, Store } from './store';

/** The page the app runs in: its URL and session history. The browser's `window`, or a double in tests. */
export interface RoutePage {
    readonly location: { href: string };
    readonly history: {
        readonly state: unknown;
        pushState(data: unknown, unused: string, url: string | URL): void;
        replaceState(data: unknown, unused: string, url: string | URL): void;
    };
    addEventListener(type: 'popstate', listener: () => void): void;
    removeEventListener(type: 'popstate', listener: () => void): void;
}

/** The person went back or forward to a URL that selects `bookId`, or the Book list without one. */
export class Navigation extends Event {
    constructor(readonly bookId: string | undefined) {
        super('navigate');
    }
}

/**
 * The app's one binding to the page URL: the selected Book. Nothing else reads or writes its path,
 * query or history.
 *
 * Standalone, each selection is a history entry, so Back and Forward work. Embedded in a Book,
 * a selection only replaces the URL, so the Book's own Back button stays the Book's. Fires a
 * `Navigation` when the person goes back or forward.
 */
export class Route extends Store {
    @reactive bookId?: string;

    constructor(
        private readonly page: RoutePage,
        private readonly embedded: boolean
    ) {
        super();
        this.bookId = bookIdFrom(page.location.href);
    }

    connect(): void {
        this.page.addEventListener('popstate', this.onPopState);
    }
    disconnect(): void {
        this.page.removeEventListener('popstate', this.onPopState);
    }

    /** Select a Book, or none for the Book list, and keep it in the URL. */
    select(bookId: string | undefined): void {
        this.bookId = bookId;
        // Compare the value, not the URL text: setting a parameter re-encodes the whole query.
        if (bookIdFrom(this.page.location.href) === bookId) return;
        const url = new URL(this.page.location.href);
        if (bookId) url.searchParams.set('bookId', bookId);
        else url.searchParams.delete('bookId');
        if (this.embedded) this.page.history.replaceState(this.page.history.state, '', url);
        else this.page.history.pushState(null, '', url);
    }

    private readonly onPopState = () =>
        this.dispatchEvent(new Navigation(bookIdFrom(this.page.location.href)));
}

function bookIdFrom(href: string): string | undefined {
    return new URL(href).searchParams.get('bookId') ?? undefined;
}
