"use client";

import { Check, Home, Navigation } from "lucide-react";

interface ReportSuccessModalProps {
    facilityName: string;
    onClose: () => void;
    onGoHome?: () => void;
}

export function ReportSuccessModal({ facilityName, onClose, onGoHome }: ReportSuccessModalProps) {
    const trackingId = `ER-${Date.now().toString().slice(-8)}`;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn">
            <div className="glass rounded-[28px] max-w-sm w-full mx-4 overflow-hidden animate-slideUp">

                {/* Header */}
                <div className="px-7 pt-8 pb-6 border-b border-white/[0.07]">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 mb-5">
                        ERly · Submitted
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                            <Check size={16} className="text-emerald-400" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-white font-semibold text-base leading-tight">Report sent</div>
                            <div className="text-white/45 text-xs mt-0.5">Pre-registered at facility</div>
                        </div>
                    </div>
                    <div className="text-white/60 text-sm leading-relaxed">
                        Your intake report has been forwarded to{" "}
                        <span className="text-white font-medium">{facilityName}</span>.
                        Head there now. Staff will have your information ready.
                    </div>
                </div>

                {/* Tracking info */}
                <div className="px-7 py-5 space-y-3 border-b border-white/[0.07]">
                    <div>
                        <div className="text-[9px] uppercase tracking-[0.25em] font-bold text-white/35 mb-1.5">
                            Tracking ID
                        </div>
                        <code className="text-emerald-400 font-mono text-sm">{trackingId}</code>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
                        <p className="text-white/45 text-[11px] leading-relaxed">
                            Present this ID at the front desk if asked. Keep a screenshot for your records.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-7 py-5 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-[0.15em] hover:bg-white/90 active:scale-[0.98] transition-all duration-150"
                    >
                        <Navigation size={13} />
                        View Directions
                    </button>
                    {onGoHome && (
                        <button
                            onClick={onGoHome}
                            className="w-12 flex items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-white/60 hover:text-white border border-white/[0.08] transition-all duration-200"
                        >
                            <Home size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
