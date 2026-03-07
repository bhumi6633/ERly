"use client";

import { LogIn, UserRound } from "lucide-react";
import { isAuthConfigured, loginWithAuth0 } from "@/lib/auth";

interface AuthModalProps {
    onContinueAsGuest: () => void;
}

export function AuthModal({ onContinueAsGuest }: AuthModalProps) {
    const authReady = isAuthConfigured();

    const handleSignIn = () => {
        if (authReady) {
            loginWithAuth0();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="glass rounded-2xl p-8 max-w-md w-full mx-4 animate-slideUp">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        ERly
                    </div>
                    <h2 className="text-white text-2xl font-bold mb-2">Welcome</h2>
                    <p className="text-white/50 text-sm leading-relaxed">
                        Sign in to save your history and preferences, or continue as a guest.
                    </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={handleSignIn}
                        disabled={!authReady}
                        className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${authReady
                            ? "bg-white text-black hover:bg-white/90"
                            : "bg-white/10 text-white/30 cursor-not-allowed"
                            }`}
                        title={!authReady ? "Auth0 not configured — add credentials to .env.local" : "Sign in with Auth0"}
                    >
                        <LogIn size={18} />
                        {authReady ? "Sign In" : "Sign In (not configured)"}
                    </button>

                    <button
                        onClick={onContinueAsGuest}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white border border-white/[0.08] hover:border-white/[0.16] transition-all duration-200 text-sm font-medium"
                    >
                        <UserRound size={18} />
                        Continue as Guest
                    </button>
                </div>

                {/* Footer */}
                <p className="text-white/25 text-xs text-center mt-6">
                    No account required to use ERly
                </p>
            </div>
        </div>
    );
}
