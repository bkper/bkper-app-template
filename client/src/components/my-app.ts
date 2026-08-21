import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AppController } from '../app/app-controller';
import type { AppState } from '../app/app-state';
import type { BalanceContainerItem, BookListItem } from '../services/book-service';

@customElement('my-app')
export class MyApp extends LitElement {
    static styles = css`
        :host {
            display: block;
            min-height: 100vh;
            box-sizing: border-box;
            padding: var(--bkper-spacing-large);
            background: var(--bkper-color-background);
            color: var(--bkper-color-text);
            font-family: var(--bkper-font-family);
        }

        .container {
            max-width: 720px;
            margin: 0 auto;
            display: grid;
            gap: var(--bkper-spacing-large);
        }

        wa-card {
            --spacing: var(--bkper-spacing-large);
        }

        .panel-header {
            display: grid;
            gap: var(--bkper-spacing-2x-small);
        }

        h1,
        p {
            margin: 0;
        }

        h1 {
            font-size: var(--bkper-font-size-large);
            font-weight: var(--bkper-font-weight-bold);
        }

        .eyebrow {
            color: var(--bkper-color-primary);
            font-size: var(--bkper-font-size-small);
            font-weight: var(--bkper-font-weight-bold);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .subtitle,
        .hint {
            color: var(--bkper-color-neutral);
            font-size: var(--bkper-font-size-small);
            line-height: var(--bkper-line-height-normal);
        }

        .book-list,
        .balance-list {
            display: grid;
            gap: var(--bkper-spacing-x-small);
        }

        .book-button {
            width: 100%;
        }

        .book-button::part(base) {
            width: 100%;
            justify-content: flex-start;
        }

        .book-button-content,
        .balance-row {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--bkper-spacing-medium);
        }

        .book-name,
        .balance-name {
            font-weight: var(--bkper-font-weight-bold);
            text-align: left;
        }

        .balance-row {
            padding: var(--bkper-spacing-small) 0;
            border-bottom: var(--bkper-border);
        }

        .balance-row:last-child {
            border-bottom: none;
        }

        .balance-value {
            color: var(--bkper-color-neutral);
            font-family: var(--bkper-font-family-code);
            white-space: nowrap;
        }

        .loading-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--bkper-spacing-small);
            min-height: 8rem;
            color: var(--bkper-color-neutral);
        }

        .back-action {
            justify-self: start;
        }
    `;

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
