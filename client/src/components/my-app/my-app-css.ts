import { css } from 'lit';

export const myAppCSS = css`
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
