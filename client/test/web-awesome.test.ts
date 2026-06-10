import { describe, expect, it } from 'bun:test';
import '../src/web-awesome';

describe('Web Awesome setup', () => {
    it('registers the template UI components used by the client', () => {
        expect(customElements.get('wa-button')).toBeDefined();
        expect(customElements.get('wa-card')).toBeDefined();
        expect(customElements.get('wa-callout')).toBeDefined();
        expect(customElements.get('wa-spinner')).toBeDefined();
    });
});
