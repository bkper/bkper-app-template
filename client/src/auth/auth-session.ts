import { BkperAuth } from '@bkper/web-auth';

export type AuthProvider = Pick<BkperAuth, 'authenticatedFetch' | 'getAccessToken' | 'refresh'>;

export type AuthSession = AuthProvider & Pick<BkperAuth, 'init' | 'login'>;

export interface AuthSessionCallbacks {
    onLoginSuccess?: () => void | Promise<void>;
    onError?: (error: unknown) => void;
}

// @bkper/web-auth owns OAuth, token refresh, and redirects.
export function createAuthSession(callbacks: AuthSessionCallbacks = {}): AuthSession {
    let auth: BkperAuth;
    auth = new BkperAuth({
        baseUrl: isLocalDevelopmentHost(window.location.hostname)
            ? window.location.origin
            : undefined,
        onLoginSuccess: () => {
            void callbacks.onLoginSuccess?.();
        },
        onLoginRequired: () => auth.login(),
        onError: callbacks.onError,
    });
    return auth;
}

export function isLocalDevelopmentHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1';
}
