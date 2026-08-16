import { describe, expect, it } from 'vitest';
import { render } from 'lit';
import '../src/web-awesome';
import { MyApp } from '../src/components/my-app';

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
});
