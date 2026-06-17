import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'http://localhost:5173/' });

if (!('attachInternals' in browserWindow.HTMLElement.prototype)) {
    Object.defineProperty(browserWindow.HTMLElement.prototype, 'attachInternals', {
        configurable: true,
        value: () => ({
            ariaLabel: null,
            checkValidity: () => true,
            form: null,
            labels: [],
            reportValidity: () => true,
            role: null,
            setFormValue: () => undefined,
            setValidity: () => undefined,
            states: new Set<string>(),
            validationMessage: '',
            validity: { valid: true },
            willValidate: true,
        }),
    });
}

const browserGlobals = [
    ['window', browserWindow],
    ['document', browserWindow.document],
    ['customElements', browserWindow.customElements],
    ['HTMLElement', browserWindow.HTMLElement],
    ['Element', browserWindow.Element],
    ['Node', browserWindow.Node],
    ['Document', browserWindow.Document],
    ['Event', browserWindow.Event],
    ['CustomEvent', browserWindow.CustomEvent],
    ['ShadowRoot', browserWindow.ShadowRoot],
    ['CSSStyleSheet', browserWindow.CSSStyleSheet],
    ['MutationObserver', browserWindow.MutationObserver],
    ['ResizeObserver', browserWindow.ResizeObserver],
    ['DOMParser', browserWindow.DOMParser],
    ['requestAnimationFrame', browserWindow.requestAnimationFrame.bind(browserWindow)],
    ['cancelAnimationFrame', browserWindow.cancelAnimationFrame.bind(browserWindow)],
    ['getComputedStyle', browserWindow.getComputedStyle.bind(browserWindow)],
] as const;

for (const [name, value] of browserGlobals) {
    Object.defineProperty(globalThis, name, {
        configurable: true,
        value,
    });
}
