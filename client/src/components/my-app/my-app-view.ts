import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { BalanceSummary, BookListItem } from '../../services/book-service';
import { AppState } from '../../state/app-state';
import type { Books } from '../../state/books';
import { watch } from '../../state/store';
import { myAppCSS } from './my-app-css';

@customElement('my-app')
export class MyApp extends LitElement {
    static styles = myAppCSS;

    readonly state = new AppState();

    constructor() {
        super();
        watch(this, () => [this.state.route, this.state.books]);
    }

    connectedCallback(): void {
        super.connectedCallback();
        this.state.connect();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.state.disconnect();
    }

    render() {
        const state = this.state.books;

        if (state.loading) {
            return html`
                <div class="container">
                    <wa-card appearance="outlined">
                        <div class="loading-content" role="status">
                            <wa-spinner></wa-spinner>
                            <span>Loading...</span>
                        </div>
                    </wa-card>
                </div>
            `;
        }

        if (state.appError) {
            return html`
                <div class="container">
                    <wa-card appearance="outlined">
                        ${this.renderCallout(state.appError, 'danger')}
                    </wa-card>
                </div>
            `;
        }

        // Book view: show accounts with balances, or a visible load error.
        const bookId = this.state.route.bookId;
        if (bookId) {
            return this.renderBookView(state, bookId);
        }

        // Book picker: show list of books.
        return this.renderBookPicker(state);
    }

    private renderBookPicker(state: Books) {
        return html`
            <div class="container">
                <wa-card appearance="outlined">
                    <div slot="header" class="panel-header">
                        <p class="eyebrow">My Bkper App</p>
                        <h1>Hello, ${state.userDisplayName}!</h1>
                        <p class="subtitle">Select a book to continue</p>
                    </div>
                    ${
                        state.books.length === 0
                            ? this.renderCallout('No books found')
                            : html`
                                  <div class="book-list">
                                      ${state.books.map(this.renderBookButton)}
                                  </div>
                              `
                    }
                </wa-card>
            </div>
        `;
    }

    private renderBookView(state: Books, bookId: string) {
        return html`
            <div class="container">
                <wa-button
                    class="back-action"
                    variant="brand"
                    appearance="plain"
                    @click=${() => void this.state.books.select(undefined)}
                >
                    &larr; Back to books
                </wa-button>
                <wa-card appearance="outlined">
                    <div slot="header" class="panel-header">
                        <p class="eyebrow">Book balances</p>
                        <h1>
                            ${
                                state.selectedBookError
                                    ? 'Could not load selected book'
                                    : (state.bookName ?? 'Selected book')
                            }
                        </h1>
                        <p class="subtitle">${state.selectedBookError ? bookId : 'Accounts'}</p>
                    </div>
                    ${
                        state.selectedBookError
                            ? this.renderCallout(state.selectedBookError, 'danger')
                            : state.balanceContainers.length === 0
                              ? this.renderCallout('No accounts found')
                              : html`
                                    <div class="balance-list">
                                        ${state.balanceContainers.map(this.renderBalanceRow)}
                                    </div>
                                `
                    }
                </wa-card>
            </div>
        `;
    }

    private renderBookButton = (book: BookListItem) => html`
        <wa-button
            class="book-button"
            variant="neutral"
            appearance="outlined"
            @click=${() => void this.state.books.select(book.id)}
        >
            <span class="book-button-content">
                <span class="book-name">${book.name}</span>
                <span class="hint">Open</span>
            </span>
        </wa-button>
    `;

    private renderBalanceRow = (container: BalanceSummary) => html`
        <div class="balance-row">
            <span class="balance-name">${container.name}</span>
            <span class="balance-value">${container.cumulativeBalanceText}</span>
        </div>
    `;

    private renderCallout(message: string, variant: 'neutral' | 'danger' = 'neutral') {
        return html`
            <wa-callout variant=${variant} appearance="outlined" size="s">${message}</wa-callout>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'my-app': MyApp;
    }
}
