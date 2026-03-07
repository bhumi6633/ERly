"use client";

/**
 * Auth helper — checks if Auth0 environment variables are configured.
 * When not configured, the app operates in "guest-only" mode.
 */

export function isAuthConfigured(): boolean {
    return !!(
        process.env.NEXT_PUBLIC_AUTH0_DOMAIN &&
        process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID
    );
}

/**
 * Initiates Auth0 login redirect.
 * Only works when Auth0 env vars are configured.
 */
export function loginWithAuth0(): void {
    if (!isAuthConfigured()) {
        console.warn("Auth0 not configured. Set AUTH0 env vars in .env.local.");
        return;
    }
    window.location.href = "/api/auth/login";
}

/**
 * Logs out and redirects to landing page.
 */
export function logout(): void {
    window.location.href = "/api/auth/logout";
}
