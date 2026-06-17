import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

function loadIndexDocument(): Document {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    return new DOMParser().parseFromString(html, 'text/html');
}

describe('theme initialization', () => {
    it('loads the shared first-paint theme script before the app module', () => {
        const doc = loadIndexDocument();
        const scripts = Array.from(doc.querySelectorAll('head script'));

        const themeScriptIndex = scripts.findIndex(script =>
            script
                .getAttribute('src')
                ?.includes('@bkper/web-components@0.2.0/dist/theme-init.global.js')
        );
        const appModuleIndex = scripts.findIndex(
            script =>
                script.getAttribute('type') === 'module' &&
                script.getAttribute('src') === '/src/index.ts'
        );

        expect(themeScriptIndex).toBeGreaterThanOrEqual(0);
        expect(appModuleIndex).toBeGreaterThanOrEqual(0);
        expect(themeScriptIndex).toBeLessThan(appModuleIndex);
        expect(scripts[themeScriptIndex].getAttribute('crossorigin')).toBe('anonymous');
    });
});
