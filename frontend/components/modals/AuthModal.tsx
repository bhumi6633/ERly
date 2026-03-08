"use client";

import { LogIn, UserRound, ArrowRight } from "lucide-react";
import { isAuthConfigured, useAuth0 } from "@/lib/auth";

interface AuthModalProps {
    onContinueAsGuest: () => void;
}

export function AuthModal({ onContinueAsGuest }: AuthModalProps) {
    const authReady = isAuthConfigured();
    const { loginWithRedirect } = useAuth0();

    const handleSignIn = () => {
        if (authReady) {
            loginWithRedirect();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md animate-fadeIn">
            <div className="glass rounded-3xl p-10 max-w-lg w-full mx-4 animate-slideUp">
                {/* Badge */}
                <div className="flex justify-center mb-7">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ERly · Emergency Triage
                    </div>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-white text-3xl font-bold mb-3 leading-tight">Find care fast.</h2>
                    <p className="text-white/55 text-sm leading-relaxed max-w-sm mx-auto">
                        Sign in to save your history, or jump straight to the map.
                    </p>
                </div>

                {/* Primary action */}
                <div className="space-y-3">
                    <button
                        onClick={handleSignIn}
                        disabled={!authReady}
                        className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                            authReady
                                ? "bg-white text-black hover:bg-white/90 active:scale-[0.98]"
                                : "bg-white/10 text-white/30 cursor-not-allowed"
                        }`}
                        title={!authReady ? "Auth0 not configured" : "Sign in with Auth0"}
                    >
                        <LogIn size={17} />
                        {authReady ? "Sign In" : "Sign In (not configured)"}
                    </button>

                    {/* Guest — equally prominent */}
                    <button
                        onClick={onContinueAsGuest}
                        className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white/[0.07] hover:bg-white/[0.13] text-white font-semibold border border-white/[0.12] hover:border-white/[0.22] transition-all duration-200 text-sm active:scale-[0.98]"
                    >
                        <UserRound size={17} />
                        Continue as Guest
                    </button>
                </div>

                {/* Skip straight to map */}
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={onContinueAsGuest}
                        className="flex items-center gap-1.5 text-white/35 hover:text-white/65 text-xs transition-colors"
                    >
                        Skip, just show me the map
                        <ArrowRight size={11} />
                    </button>
                </div>
            </div>
        </div>
    );
}
