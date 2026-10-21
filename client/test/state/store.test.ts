import { describe, expect, it } from 'vitest';
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { reactive, Store, watch } from '../../src/state/store';

// What `@reactive count = 0` declares in a store; tests apply it directly.
class Counter extends Store {
    declare count: number;
}
reactive(Counter.prototype, 'count');

class TestHost implements ReactiveControllerHost {
    readonly updateComplete = Promise.resolve(true);
    readonly controllers: ReactiveController[] = [];
    updates = 0;

    addController(controller: ReactiveController): void {
        this.controllers.push(controller);
    }
    removeController(): void {}
    requestUpdate(): void {
        this.updates += 1;
    }
}

describe('Store', () => {
    it('announces a change only when a reactive field gets a different value', () => {
        const counter = new Counter();
        counter.count = 0;
        let changes = 0;
        counter.addEventListener('change', () => (changes += 1));

        counter.count = 0;
        counter.count = 1;
        counter.count = 1;
        counter.count = 2;

        expect(changes).toBe(2);
    });

    it('renders a watching component again only while it is connected', () => {
        const counter = new Counter();
        const host = new TestHost();
        watch(host, () => [counter]);

        counter.count = 1;
        host.controllers.forEach(controller => controller.hostConnected?.());
        counter.count = 2;
        host.controllers.forEach(controller => controller.hostDisconnected?.());
        counter.count = 3;

        expect(host.updates).toBe(1);
    });
});
