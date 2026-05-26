export function createBearerAuthHeaders(accessToken: string | undefined): HeadersInit {
    const token = accessToken?.trim();
    if (!token) {
        throw new Error('Missing access token for app API request');
    }

    return {
        Authorization: `Bearer ${token}`,
    };
}
