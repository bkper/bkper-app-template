import type { ReactiveControllerHost } from 'lit';

const CHANGE = 'change';
const values = new WeakMap<Store, Map<string, unknown>>();
const notify = (store: Store) => store.dispatchEvent(new Event(CHANGE));

/**
 * Shared client state that tells the components watching it when it changes. Holds no DOM.
 * Requests for the interface (focus an input, open a menu) are events of their own, never calls
 * into a component.
 */
export class Store extends EventTarget {
    /** Tell watchers to render again; `@reactive` fields do this on every change. */
    protected changed(): void {
        notify(this);
    }
}

/** A store field that tells watchers when it changes, like Lit's `@state`. */
export function reactive(proto: Store, name: string): void {
    Object.defineProperty(proto, name, {
        configurable: true,
        enumerable: true,
        get(this: Store) {
            return values.get(this)?.get(name);
        },
        set(this: Store, value: unknown) {
            let own = values.get(this);
            if (!own) values.set(this, (own = new Map()));
            if (own.has(name) && Object.is(own.get(name), value)) return;
            own.set(name, value);
            notify(this);
        },
    });
}

/**
 * Render `host` again whenever one of the `stores` changes, while it is connected. `stores` is
 * read on connection, so a component can register this before it is given its state.
 */
export function watch(host: ReactiveControllerHost, stores: () => readonly Store[]): void {
    const update = () => host.requestUpdate();
    let watched: readonly Store[] = [];
    host.addController({
        hostConnected: () => {
            watched = stores();
            for (const store of watched) store.addEventListener(CHANGE, update);
        },
        hostDisconnected: () => {
            for (const store of watched) store.removeEventListener(CHANGE, update);
            watched = [];
        },
    });
}

/** Listen to a store's own event while `host` is connected; `store` is read on connection. */
export function on(
    host: ReactiveControllerHost,
    store: () => EventTarget,
    type: string,
    listener: (event: Event) => void
): void {
    let target: EventTarget | undefined;
    host.addController({
        hostConnected: () => {
            target = store();
            target.addEventListener(type, listener);
        },
        hostDisconnected: () => {
            target?.removeEventListener(type, listener);
            target = undefined;
        },
    });
}
