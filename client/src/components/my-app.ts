import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AppController } from '../app/app-controller';
import type { AppState } from '../app/app-state';

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

    private readonly controller = new AppController(this);

    render() {
        const state = this.controller.state;

        if (state.loading) {
            return html`
                <div class="container">
                    <div class="loading">Loading...</div>
                </div>
            `;
        }

        // Book view: show accounts with balances, or a visible load error.
        if (state.bookId) {
            return this.renderBookView(state);
        }

        // Book picker: show list of books
        return this.renderBookPicker(state);
    }

    private renderBookPicker(state: AppState) {
        return html`
            <div class="container">
                <div class="header">
                    <div>
                        <h1>Hello, ${state.userDisplayName}!</h1>
                        <h2>Select a book to continue</h2>
                    </div>
                </div>

                ${state.books.length === 0
                    ? html`<div class="empty">No books found</div>`
                    : html`
                          <div class="list">
                              ${state.books.map(
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

                <div class="section">
                    <h2>Server API example</h2>
                    <p class="note">
                        These books are loaded through <code>/api/books</code> with a bearer token.
                        The platform validates it before the app server calls Bkper with outbound
                        auth injection.
                    </p>
                    ${state.serverBooksError
                        ? html`<div class="error">${state.serverBooksError}</div>`
                        : state.serverBooks.length === 0
                          ? html`<div class="empty">No books returned by server API</div>`
                          : html`
                                <div class="list">
                                    ${state.serverBooks.map(
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

    private renderBookView(state: AppState) {
        return html`
            <div class="container">
                <a href="?" class="back-link">&larr; Back to books</a>

                ${state.selectedBookError
                    ? html`
                          <div class="header">
                              <div>
                                  <h1>Could not load selected book</h1>
                                  <h2>${state.bookId}</h2>
                              </div>
                          </div>
                          <div class="error">${state.selectedBookError}</div>
                      `
                    : html`
                          <div class="header">
                              <div>
                                  <h1>${state.bookName ?? 'Selected book'}</h1>
                                  <h2>Accounts</h2>
                              </div>
                          </div>
                      `}
                ${!state.selectedBookError && state.balanceContainers.length === 0
                    ? html`<div class="empty">No accounts found</div>`
                    : html`
                          <div class="list">
                              ${state.balanceContainers.map(
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

    private handleBookClick(bookId: string) {
        this.controller.selectBook(bookId);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'my-app': MyApp;
    }
}
