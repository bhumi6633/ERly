"use client";

import { useAuth0 } from "@/lib/auth";
import { isAuthConfigured } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Activity, Mail, Shield, Calendar } from "lucide-react";

export default function ProfilePage() {
  const { isLoading, isAuthenticated, user, loginWithRedirect } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated && isAuthConfigured()) {
      loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (!isAuthConfigured()) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Auth0 is not configured.</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-4 py-2 bg-emerald-600 rounded-md hover:bg-emerald-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-400" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/")}
            className="text-emerald-400 hover:text-emerald-300 mb-4 flex items-center gap-2"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl font-bold mb-2">User Profile</h1>
          <p className="text-gray-400">Your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
          {/* Avatar */}
          <div className="flex items-start gap-6 mb-8">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name || "User"}
                className="w-24 h-24 rounded-full border-2 border-emerald-400"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center text-2xl font-bold">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-semibold mb-1">{user?.name || "User"}</h2>
              <p className="text-gray-400">{user?.email}</p>
            </div>
          </div>

          {/* User Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
              <Mail className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400 mb-1">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
              <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400 mb-1">Email Verified</p>
                <p className="font-medium">
                  {user?.email_verified ? "Yes" : "No"}
                </p>
              </div>
            </div>

            {user?.updated_at && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
                <Calendar className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                  <p className="font-medium">
                    {new Date(user.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
              <Activity className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400 mb-1">User ID</p>
                <p className="font-medium text-xs break-all">{user?.sub}</p>
              </div>
            </div>
          </div>

          {/* Raw User Data (for debugging) */}
          <details className="mt-8">
            <summary className="cursor-pointer text-gray-400 hover:text-white mb-4">
              View Raw User Data
            </summary>
            <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(user, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
