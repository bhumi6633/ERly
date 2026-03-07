"use client";

import { Auth0Provider } from "@auth0/auth0-react";
import { ReactNode } from "react";

export function Auth0ProviderWrapper({ children }: { children: ReactNode }) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;

  // If Auth0 is not configured, render children without provider
  if (!domain || !clientId) {
    console.warn("Auth0 not configured. Running in guest-only mode.");
    return <>{children}</>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
      }}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}
