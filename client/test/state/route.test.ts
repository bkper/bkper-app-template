import { describe, expect, it } from 'vitest';
import { Navigation, Route, type RoutePage } from '../../src/state/route';

function createPage(href: string) {
    const listeners = new Set<() => void>();
    const writes: { mode: 'push' | 'replace'; href: string }[] = [];
    const page: RoutePage = {
        location: { href },
        history: {
            state: null,
            pushState: (_data, _unused, url) => {
                writes.push({ mode: 'push', href: String(url) });
                page.location.href = String(url);
            },
            replaceState: (_data, _unused, url) => {
                writes.push({ mode: 'replace', href: String(url) });
                page.location.href = String(url);
            },
        },
        addEventListener: (_type, listener) => listeners.add(listener),
        removeEventListener: (_type, listener) => listeners.delete(listener),
    };
    const goTo = (url: string) => {
        page.location.href = url;
        for (const listener of listeners) listener();
    };
    return { page, writes, goTo };
}

describe('Route', () => {
    it('reads the selected Book from the URL', () => {
        const { page } = createPage('https://my-app.bkper.app/?bookId=book-1&query=x');

        expect(new Route(page, false).bookId).toBe('book-1');
    });

    it('adds a history entry per selection when standalone, keeping other parameters', () => {
        const { page, writes } = createPage('https://my-app.bkper.app/?query=x');
        const route = new Route(page, false);

        route.select('book 1');
        route.select(undefined);

        expect(route.bookId).toBeUndefined();
        expect(writes).toEqual([
            { mode: 'push', href: 'https://my-app.bkper.app/?query=x&bookId=book+1' },
            { mode: 'push', href: 'https://my-app.bkper.app/?query=x' },
        ]);
    });

    it('only replaces the URL when embedded in a Book, so Back stays the Book’s', () => {
        const { page, writes } = createPage('https://my-app.bkper.app/');
        const route = new Route(page, true);

        route.select('book-1');

        expect(writes).toEqual([
            { mode: 'replace', href: 'https://my-app.bkper.app/?bookId=book-1' },
        ]);
    });

    it('does not write a URL that already shows the selection', () => {
        const { page, writes } = createPage('https://my-app.bkper.app/?bookId=book-1');

        new Route(page, false).select('book-1');

        expect(writes).toEqual([]);
    });

    it('writes no history when following Back to a URL that already shows the selection', () => {
        const { page, writes } = createPage(
            "https://my-app.bkper.app/?bookId=book-1&query=account%3A'Sales%20Revenue'"
        );

        new Route(page, false).select('book-1');

        expect(writes).toEqual([]);
    });

    it('reports Back and Forward while connected', () => {
        const { page, goTo } = createPage('https://my-app.bkper.app/?bookId=book-1');
        const route = new Route(page, false);
        const navigations: (string | undefined)[] = [];
        route.addEventListener('navigate', event => {
            if (event instanceof Navigation) navigations.push(event.bookId);
        });

        route.connect();
        goTo('https://my-app.bkper.app/');
        goTo('https://my-app.bkper.app/?bookId=book-2');
        route.disconnect();
        goTo('https://my-app.bkper.app/');

        expect(navigations).toEqual([undefined, 'book-2']);
    });
});
