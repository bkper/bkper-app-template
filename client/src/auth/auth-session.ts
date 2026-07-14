import { BkperAuth, type BkperAuthConfig } from '@bkper/web-auth';

export interface AuthProvider {
    authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
    getAccessToken(): string | undefined;
    refresh(): Promise<void>;
}

export interface AuthClient extends AuthProvider {
    init(): Promise<void>;
    login(): void;
}

export type AuthSession = AuthClient;

export interface AuthSessionLocation {
    hostname: string;
    origin: string;
}

export interface AuthSessionCallbacks {
    onLoginSuccess?: () => void | Promise<void>;
    onError?: (error: unknown) => void;
}

export interface AuthSessionOptions extends AuthSessionCallbacks {
    location?: AuthSessionLocation;
    createClient?: (config: BkperAuthConfig) => AuthClient;
}

// AUTH PATTERN: @bkper/web-auth handles OAuth, token refresh, and redirects.
// Keep those operations behind this small provider boundary for client services.
export function createAuthSession(options: AuthSessionOptions = {}): AuthSession {
    return new BkperAuthSession(options);
}

export function isLocalDevelopmentHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

class BkperAuthSession implements AuthSession {
    private readonly client: AuthClient;

    constructor(options: AuthSessionOptions) {
        const location = options.location ?? getBrowserLocation();
        const createClient = options.createClient ?? (config => new BkperAuth(config));

        this.client = createClient({
            baseUrl: getAuthBaseUrl(location),
            onLoginSuccess: () => {
                void options.onLoginSuccess?.();
            },
            onLoginRequired: () => this.login(),
            onError: options.onError,
        });
    }

    authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        return this.client.authenticatedFetch(input, init);
    }

    getAccessToken(): string | undefined {
        return this.client.getAccessToken();
    }

    init(): Promise<void> {
        return this.client.init();
    }

    login(): void {
        this.client.login();
    }

    refresh(): Promise<void> {
        return this.client.refresh();
    }
}

function getAuthBaseUrl(location: AuthSessionLocation): string | undefined {
    return isLocalDevelopmentHost(location.hostname) ? location.origin : undefined;
}

function getBrowserLocation(): AuthSessionLocation {
    return {
        hostname: window.location.hostname,
        origin: window.location.origin,
    };
}
