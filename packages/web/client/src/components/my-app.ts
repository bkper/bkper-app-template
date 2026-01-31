import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { BkperAuth } from "@bkper/web-auth";

@customElement("my-app")
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
            margin-bottom: var(--bkper-spacing-medium);
        }

        .login-container {
            text-align: center;
            padding: var(--bkper-spacing-x-large);
        }

        button {
            background: var(--bkper-color-primary);
            color: white;
            border: none;
            padding: var(--bkper-spacing-small) var(--bkper-spacing-medium);
            border-radius: var(--bkper-border-radius);
            cursor: pointer;
            font-size: var(--bkper-font-size-medium);
        }

        button:hover {
            opacity: 0.9;
        }

        .content {
            border: var(--bkper-border);
            border-radius: var(--bkper-border-radius);
            padding: var(--bkper-spacing-medium);
        }

        .book-id {
            color: var(--bkper-color-neutral);
            font-size: var(--bkper-font-size-small);
        }
    `;

    private auth = new BkperAuth({
        onLoginSuccess: () => {
            this.authenticated = true;
        },
        onLoginRequired: () => {
            this.authenticated = false;
        },
        onError: (error) => {
            console.error("Auth error:", error);
        },
    });

    @state()
    private authenticated = false;

    @state()
    private bookId: string | null = null;

    async connectedCallback() {
        super.connectedCallback();

        // Get bookId from URL
        const params = new URLSearchParams(window.location.search);
        this.bookId = params.get("bookId");

        // Initialize auth
        await this.auth.init();
    }

    private handleLogin() {
        this.auth.login();
    }

    private handleLogout() {
        this.auth.logout();
    }

    render() {
        if (!this.authenticated) {
            return html`
                <div class="container">
                    <div class="login-container">
                        <h1>My Bkper App</h1>
                        <p>Please login to continue to Bkper</p>
                        <button @click=${this.handleLogin}>Login with Bkper</button>
                    </div>
                </div>
            `;
        }

        return html`
            <div class="container">
                <h1>My Bkper App</h1>
                ${this.bookId
                    ? html`<p class="book-id">Book ID: ${this.bookId}</p>`
                    : html`<p class="book-id">No book selected</p>`}

                <div class="content">
                    <p>Your app content goes here.</p>
                    <p>Use the <code>@bkper/web-auth</code> token to make API calls:</p>
                    <pre>auth.getAccessToken()</pre>
                </div>

                <br />
                <button @click=${this.handleLogout}>Logout</button>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "my-app": MyApp;
    }
}
