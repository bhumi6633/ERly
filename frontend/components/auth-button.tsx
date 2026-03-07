"use client";

import { useAuth0 } from "@/lib/auth";
import { isAuthConfigured } from "@/lib/auth";

export function AuthButton() {
  const { isLoading, isAuthenticated, user, loginWithRedirect, logout } = useAuth0();

  // If Auth0 is not configured, don't show auth buttons
  if (!isAuthConfigured()) {
    return null;
  }

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading...</div>;
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          {user.name || user.email}
        </span>
        <button
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: "signup" } })}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Sign Up
      </button>
      <button
        onClick={() => loginWithRedirect()}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Login
      </button>
    </div>
  );
}
