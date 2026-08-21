import { describe, expect, it } from 'vitest';
import { render } from 'lit';
import '../../../src/web-awesome';
import {
    AppController,
    createInitialAppState,
} from '../../../src/components/my-app/my-app-controller';
import { MyApp } from '../../../src/components/my-app/my-app-view';

describe('MyApp component', () => {
    it('renders the loading state with Web Awesome components', () => {
        const app = new MyApp();
        const container = document.createElement('div');

        render(app.render(), container);

        const CardElement = customElements.get('wa-card');
        const SpinnerElement = customElements.get('wa-spinner');
        const card = container.querySelector('wa-card');
        const spinner = container.querySelector('wa-spinner');

        if (!CardElement || !SpinnerElement) {
            throw new Error('Web Awesome components were not registered');
        }

        expect(card).toBeInstanceOf(CardElement);
        expect(spinner).toBeInstanceOf(SpinnerElement);
    });

    it('renders an initial data failure instead of an empty Book list', () => {
        const app = new MyApp();
        const controller = Reflect.get(app, 'controller') as AppController;
        controller.state = {
            ...createInitialAppState(),
            loading: false,
            appError: 'Could not load your Bkper data. Please reload and try again.',
        };
        const container = document.createElement('div');

        render(app.render(), container);

        const callout = container.querySelector('wa-callout');
        expect(callout?.getAttribute('variant')).toBe('danger');
        expect(callout?.textContent).toContain(
            'Could not load your Bkper data. Please reload and try again.'
        );
        expect(container.textContent).not.toContain('No books found');
    });

    it('renders one direct Book picker without duplicating the list through the app API', () => {
        const app = new MyApp();
        const controller = Reflect.get(app, 'controller') as AppController;
        controller.state = {
            ...createInitialAppState(),
            loading: false,
            userDisplayName: 'Ada',
            books: [{ id: 'book-1', name: 'Main Book' }],
        };
        const container = document.createElement('div');

        render(app.render(), container);

        expect(container.querySelectorAll('wa-card')).toHaveLength(1);
        expect(container.textContent).toContain('Main Book');
    });
});
