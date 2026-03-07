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
 * Re-export the useAuth0 hook for convenience.
 * Use this hook in your components to access authentication state and methods.
 * 
 * Example:
 * const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
 */
export { useAuth0 } from "@auth0/auth0-react";
