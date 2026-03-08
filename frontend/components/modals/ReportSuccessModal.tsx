"use client";

import { Check, Home, Navigation } from "lucide-react";

interface ReportSuccessModalProps {
    facilityName: string;
    patientId: string;
    onClose: () => void;
    onGoHome?: () => void;
}

export function ReportSuccessModal({ facilityName, patientId, onClose, onGoHome }: ReportSuccessModalProps) {
    // patientId is "PT-XXXXXX" — show prefix + code separately
    const [prefix, code] = patientId.includes("-") ? patientId.split("-") : ["PT", patientId];

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn">
            <div className="glass rounded-[28px] max-w-sm w-full mx-4 overflow-hidden animate-slideUp">

                {/* Token Hero — top of card */}
                <div className="relative px-5 pt-6 pb-5 border-b border-white/[0.07] overflow-hidden">
                    {/* Intense ambient glow */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-36 bg-emerald-500/30 blur-3xl rounded-full pointer-events-none animate-pulse" />

                    <div className="relative text-[10px] uppercase tracking-[0.35em] font-bold text-white/30 mb-4 px-2">
                        ERly · Submitted
                    </div>

                    {/* Token card */}
                    <div className="relative rounded-2xl overflow-hidden">
                        {/* Layered backgrounds */}
                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 via-[#001a0d] to-black" />
                        {/* Grid texture */}
                        <div
                            className="absolute inset-0 opacity-[0.06] pointer-events-none"
                            style={{
                                backgroundImage:
                                    "linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)",
                                backgroundSize: "22px 22px",
                            }}
                        />
                        {/* Radial glow behind number */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_52%,rgba(16,185,129,0.22),transparent_70%)]" />
                        <div className="absolute inset-0 border border-emerald-500/30 rounded-2xl" />

                        {/* Corner brackets */}
                        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-emerald-400/35 rounded-tl-sm" />
                        <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-emerald-400/35 rounded-tr-sm" />
                        <div className="absolute bottom-[52px] left-3 w-5 h-5 border-b-2 border-l-2 border-emerald-400/35 rounded-bl-sm" />
                        <div className="absolute bottom-[52px] right-3 w-5 h-5 border-b-2 border-r-2 border-emerald-400/35 rounded-br-sm" />

                        <div className="relative px-6 pt-5 pb-0">
                            {/* Label row */}
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[8px] uppercase tracking-[0.45em] font-black text-emerald-400/50">
                                    {prefix} · Patient Token
                                </span>
                                <div className="flex gap-1.5 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <div className="w-1 h-1 rounded-full bg-emerald-400/40" />
                                    <div className="w-1 h-1 rounded-full bg-emerald-400/20" />
                                </div>
                            </div>

                            {/* Giant glowing token code */}
                            <div className="flex items-center justify-center py-4">
                                <span
                                    className="text-emerald-400 font-mono text-[56px] font-black tabular-nums leading-none tracking-widest"
                                    style={{
                                        textShadow:
                                            "0 0 30px rgba(16,185,129,0.7), 0 0 70px rgba(16,185,129,0.35), 0 0 120px rgba(16,185,129,0.15)",
                                    }}
                                >
                                    {code}
                                </span>
                            </div>
                        </div>

                        {/* Dashed ticket tear line + hint */}
                        <div className="relative border-t border-dashed border-emerald-500/25 mx-0">
                            <div className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-black/60" />
                            <div className="absolute -right-2 -top-2 w-4 h-4 rounded-full bg-black/60" />
                            <p className="text-center text-emerald-500/45 text-[9px] uppercase tracking-[0.5em] font-black py-3.5 px-4">
                                Show · Front Desk · Screenshot
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status + message */}
                <div className="px-7 pt-5 pb-6 border-b border-white/[0.07]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                            <Check size={14} className="text-emerald-400" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-white font-semibold text-sm leading-tight">Report sent</div>
                            <div className="text-white/40 text-xs mt-0.5">Pre-registered at facility</div>
                        </div>
                    </div>
                    <div className="text-white/55 text-sm leading-relaxed">
                        Your intake report has been forwarded to{" "}
                        <span className="text-white font-semibold">{facilityName}</span>.
                        Head there now and staff will have your information ready!
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
