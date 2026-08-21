import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { BalanceContainerItem, BookListItem } from '../../services/book-service';
import { AppController, type AppState } from './my-app-controller';
import { myAppCSS } from './my-app-css';

@customElement('my-app')
export class MyApp extends LitElement {
    static styles = myAppCSS;

    private readonly controller = new AppController(this);

    render() {
        const state = this.controller.state;

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
        if (state.bookId) {
            return this.renderBookView(state);
        }

        // Book picker: show list of books.
        return this.renderBookPicker(state);
    }

    private renderBookPicker(state: AppState) {
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

    private renderBookView(state: AppState) {
        return html`
            <div class="container">
                <wa-button href="?" class="back-action" variant="brand" appearance="plain">
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
                        <p class="subtitle">
                            ${state.selectedBookError ? state.bookId : 'Accounts'}
                        </p>
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
            @click=${() => this.handleBookClick(book.id)}
        >
            <span class="book-button-content">
                <span class="book-name">${book.name}</span>
                <span class="hint">Open</span>
            </span>
        </wa-button>
    `;

    private renderBalanceRow = (container: BalanceContainerItem) => html`
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

    private handleBookClick(bookId: string) {
        this.controller.selectBook(bookId);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'my-app': MyApp;
    }
}
