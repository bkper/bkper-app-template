import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { BkperAuth } from '@bkper/web-auth';
import { Bkper, Book, User } from 'bkper-js';
import { createAppApi, type AppApi, type BalanceContainer, type BookSummary } from '../api/app-api';

const isLocalDev =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

@customElement('my-app')
export class MyApp extends LitElement {
    static styles = css`
        :host {
            display: block;
            padding: var(--bkper-spacing-large);
            font-family: system-ui, sans-serif;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
        }

        h1 {
            font-size: var(--bkper-font-size-large);
            font-weight: var(--bkper-font-weight-bold);
            margin-bottom: var(--bkper-spacing-small);
        }

        h2 {
            font-size: var(--bkper-font-size-medium);
            font-weight: var(--bkper-font-weight-medium);
            margin-bottom: var(--bkper-spacing-medium);
            color: var(--bkper-color-neutral);
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--bkper-spacing-large);
        }

        .section {
            margin-top: var(--bkper-spacing-large);
        }

        .note {
            color: var(--bkper-color-neutral);
            font-size: var(--bkper-font-size-small);
            margin-top: calc(-1 * var(--bkper-spacing-small));
            margin-bottom: var(--bkper-spacing-medium);
        }

        .error {
            color: var(--bkper-color-danger, #b00020);
            font-size: var(--bkper-font-size-small);
            margin-bottom: var(--bkper-spacing-medium);
        }

        .list {
            border: var(--bkper-border);
            border-radius: var(--bkper-border-radius);
            overflow: hidden;
        }

        .list-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--bkper-spacing-medium);
            border-bottom: var(--bkper-border);
            cursor: pointer;
            transition: background-color 0.15s;
        }

        .list-item:last-child {
            border-bottom: none;
        }

        .list-item:hover {
            background-color: var(--bkper-color-background-hover, #f5f5f5);
        }

        .list-item.no-hover {
            cursor: default;
        }

        .list-item.no-hover:hover {
            background-color: transparent;
        }

        .list-item-name {
            font-weight: var(--bkper-font-weight-medium);
        }

        .list-item-value {
            color: var(--bkper-color-neutral);
            font-family: monospace;
        }

        .loading {
            text-align: center;
            padding: var(--bkper-spacing-large);
            color: var(--bkper-color-neutral);
        }

        .empty {
            text-align: center;
            padding: var(--bkper-spacing-large);
            color: var(--bkper-color-neutral);
        }

        .back-link {
            color: var(--bkper-color-primary);
            text-decoration: none;
            font-size: var(--bkper-font-size-small);
            margin-bottom: var(--bkper-spacing-medium);
            display: inline-block;
        }

        .back-link:hover {
            text-decoration: underline;
        }
    `;

    // AUTH PATTERN: @bkper/web-auth handles OAuth automatically on *.bkper.app.
    // Initialize with auth.init(), get token with auth.getAccessToken().
    // Do NOT implement custom OAuth. This is the canonical pattern.
    private auth = new BkperAuth({
        baseUrl: isLocalDev ? window.location.origin : undefined,
        onLoginSuccess: () => {
            this.loadData();
        },
        onLoginRequired: () => {
            this.auth.login();
        },
        onError: error => {
            console.error('Auth error:', error);
        },
    });

    private bkper: Bkper | null = null;
    private appApi: AppApi | null = null;

    @state()
    private loading = true;

    @state()
    private user: User | null = null;

    @state()
    private books: Book[] = [];

    @state()
    private serverBooks: BookSummary[] = [];

    @state()
    private serverBooksError: string | null = null;

    @state()
    private bookName: string | null = null;

    @state()
    private selectedBookError: string | null = null;

    @state()
    private balanceContainers: BalanceContainer[] = [];

    @state()
    private bookId: string | null = null;

    async connectedCallback() {
        super.connectedCallback();

        // Get bookId from URL
        const params = new URLSearchParams(window.location.search);
        this.bookId = params.get('bookId');

        // Initialize auth - will trigger onLoginSuccess or onLoginRequired
        await this.auth.init();
    }

    private async loadData() {
        // Initialize bkper-js with auth token
        this.bkper = new Bkper({
            oauthTokenProvider: async () => this.auth.getAccessToken(),
        });
        this.appApi = createAppApi({
            getAccessToken: () => this.auth.getAccessToken(),
        });

        this.loading = true;

        try {
            // Always fetch user info
            this.user = await this.bkper.getUser();

            if (this.bookId) {
                // Load specific book and its accounts
                await this.loadBook(this.bookId);
            } else {
                // Load all books directly from the browser using @bkper/web-auth.
                this.books = await this.bkper.getBooks();
                // Load the same kind of data through this app's server API.
                await this.loadServerBooks();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            this.loading = false;
        }
    }

    private getAppApi(): AppApi {
        if (!this.appApi) {
            throw new Error('App API is not initialized');
        }
        return this.appApi;
    }

    private async loadBook(bookId: string) {
        this.selectedBookError = null;
        this.bookName = null;
        this.balanceContainers = [];

        try {
            const payload = await this.getAppApi().getBookBalances(bookId);
            this.bookName = payload.book.name;
            this.balanceContainers = payload.balances;
        } catch (error) {
            console.error('Error loading book from server API:', error);
            this.selectedBookError = error instanceof Error ? error.message : String(error);
        }
    }

    private async loadServerBooks() {
        this.serverBooksError = null;

        try {
            this.serverBooks = await this.getAppApi().getBooks();
        } catch (error) {
            console.error('Error loading books from server API:', error);
            this.serverBooksError = error instanceof Error ? error.message : String(error);
            this.serverBooks = [];
        }
    }

    private handleBookClick(bookId: string) {
        window.location.href = `?bookId=${bookId}`;
    }

    private getUserDisplayName(): string {
        if (!this.user) return '';
        return this.user.getName() || this.user.getFullName() || 'there';
    }

    render() {
        if (this.loading) {
            return html`
                <div class="container">
                    <div class="loading">Loading...</div>
                </div>
            `;
        }

        // Book view: show accounts with balances, or a visible load error.
        if (this.bookId) {
            return this.renderBookView();
        }

        // Book picker: show list of books
        return this.renderBookPicker();
    }

    private renderBookPicker() {
        return html`
            <div class="container">
                <div class="header">
                    <div>
                        <h1>Hello, ${this.getUserDisplayName()}!</h1>
                        <h2>Select a book to continue</h2>
                    </div>
                </div>

                ${this.books.length === 0
                    ? html`<div class="empty">No books found</div>`
                    : html`
                          <div class="list">
                              ${this.books.map(
                                  book => html`
                                      <div
                                          class="list-item"
                                          @click=${() => this.handleBookClick(book.getId())}
                                      >
                                          <span class="list-item-name">${book.getName()}</span>
                                      </div>
                                  `
                              )}
                          </div>
                      `}

                <div class="section">
                    <h2>Server API example</h2>
                    <p class="note">
                        These books are loaded through <code>/api/books</code> with a bearer token.
                        The platform validates it before the app server calls Bkper with outbound
                        auth injection.
                    </p>
                    ${this.serverBooksError
                        ? html`<div class="error">${this.serverBooksError}</div>`
                        : this.serverBooks.length === 0
                          ? html`<div class="empty">No books returned by server API</div>`
                          : html`
                                <div class="list">
                                    ${this.serverBooks.map(
                                        book => html`
                                            <div
                                                class="list-item"
                                                @click=${() => this.handleBookClick(book.id)}
                                            >
                                                <span class="list-item-name">${book.name}</span>
                                            </div>
                                        `
                                    )}
                                </div>
                            `}
                </div>
            </div>
        `;
    }

    private renderBookView() {
        return html`
            <div class="container">
                <a href="?" class="back-link">&larr; Back to books</a>

                ${this.selectedBookError
                    ? html`
                          <div class="header">
                              <div>
                                  <h1>Could not load selected book</h1>
                                  <h2>${this.bookId}</h2>
                              </div>
                          </div>
                          <div class="error">${this.selectedBookError}</div>
                      `
                    : html`
                          <div class="header">
                              <div>
                                  <h1>${this.bookName ?? 'Selected book'}</h1>
                                  <h2>Accounts</h2>
                              </div>
                          </div>
                      `}
                ${!this.selectedBookError && this.balanceContainers.length === 0
                    ? html`<div class="empty">No accounts found</div>`
                    : html`
                          <div class="list">
                              ${this.balanceContainers.map(
                                  container => html`
                                      <div class="list-item no-hover">
                                          <span class="list-item-name">${container.name}</span>
                                          <span class="list-item-value">
                                              ${container.cumulativeBalanceText}
                                          </span>
                                      </div>
                                  `
                              )}
                          </div>
                      `}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'my-app': MyApp;
    }
}
