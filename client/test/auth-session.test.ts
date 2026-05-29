import { describe, expect, it } from 'bun:test';
import { createAuthSession, isLocalDevelopmentHost } from '../src/auth/auth-session';
import type { AuthClient } from '../src/auth/auth-session';
import type { BkperAuthConfig } from '@bkper/web-auth';

describe('createAuthSession', () => {
    it('uses the app origin for local development auth', () => {
        let capturedConfig: BkperAuthConfig | undefined;
        const client: AuthClient = {
            getAccessToken: () => 'token-123',
            init: async () => undefined,
            login: () => undefined,
        };

        const session = createAuthSession({
            location: { hostname: 'localhost', origin: 'http://localhost:5173' },
            createClient: config => {
                capturedConfig = config;
                return client;
            },
        });

        expect(session.getAccessToken()).toBe('token-123');
        expect(capturedConfig?.baseUrl).toBe('http://localhost:5173');
    });

    it('delegates login-required callbacks to the auth client login method', () => {
        let loginCalls = 0;
        let capturedConfig: BkperAuthConfig | undefined;

        createAuthSession({
            location: { hostname: 'my-app.bkper.app', origin: 'https://my-app.bkper.app' },
            createClient: config => {
                capturedConfig = config;
                return {
                    getAccessToken: () => undefined,
                    init: async () => undefined,
                    login: () => {
                        loginCalls += 1;
                    },
                };
            },
        });

        capturedConfig?.onLoginRequired?.();

        expect(capturedConfig?.baseUrl).toBeUndefined();
        expect(loginCalls).toBe(1);
    });
});

describe('isLocalDevelopmentHost', () => {
    it('recognizes localhost development hosts', () => {
        expect(isLocalDevelopmentHost('localhost')).toBe(true);
        expect(isLocalDevelopmentHost('127.0.0.1')).toBe(true);
        expect(isLocalDevelopmentHost('my-app.bkper.app')).toBe(false);
    });
});
