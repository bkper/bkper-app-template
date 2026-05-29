import { BkperAuth, type BkperAuthConfig } from '@bkper/web-auth';

export interface AccessTokenProvider {
    getAccessToken(): string | undefined;
}

export interface AuthClient extends AccessTokenProvider {
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
// Keep that concern here so components and services only depend on getAccessToken().
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

    getAccessToken(): string | undefined {
        return this.client.getAccessToken();
    }

    init(): Promise<void> {
        return this.client.init();
    }

    login(): void {
        this.client.login();
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
