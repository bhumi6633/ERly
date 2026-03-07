"use client";

import { CheckCircle2, Download, Home } from "lucide-react";

interface ReportSuccessModalProps {
    facilityName: string;
    onClose: () => void;
    onGoHome?: () => void;
}

export function ReportSuccessModal({ facilityName, onClose, onGoHome }: ReportSuccessModalProps) {
    const trackingId = `ER-${Date.now().toString().slice(-8)}`;
    // Generate random token number between 1-99
    const tokenNumber = Math.floor(Math.random() * 99) + 1;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="glass rounded-2xl max-w-md w-full mx-4 overflow-hidden animate-slideUp">
                {/* Success Icon */}
                <div className="flex flex-col items-center justify-center px-6 pt-8 pb-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 animate-scaleIn">
                        <CheckCircle2 size={32} className="text-emerald-400" />
                    </div>
                    <h2 className="text-white font-semibold text-xl mb-2">Report Submitted!</h2>
                    <p className="text-white/60 text-sm text-center leading-relaxed">
                        Your medical report has been successfully sent to
                    </p>
                    <p className="text-white font-medium text-center mt-1">{facilityName}</p>
                </div>

                {/* Tracking Info */}
                <div className="px-6 pb-6">
                    {/* Token Number */}
                    <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 p-6 mb-4">
                        <div className="text-center">
                            <div className="text-white/60 text-xs uppercase tracking-wider mb-2">Your Token Number</div>
                            <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-1">
                                {tokenNumber.toString().padStart(2, '0')}
                            </div>
                            <div className="text-white/40 text-xs">Please wait for your turn</div>
                        </div>
                    </div>

                    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 mb-4">
                        <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Tracking ID</div>
                        <div className="flex items-center justify-between">
                            <code className="text-emerald-400 font-mono text-sm">{trackingId}</code>
                            <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
                                <Download size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 mb-4">
                        <p className="text-blue-300 text-xs leading-relaxed">
                            The facility has received your information and will review it shortly. 
                            Please proceed to the location for further evaluation.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white transition-all duration-200 text-sm font-semibold"
                        >
                            View Directions
                        </button>
                        {onGoHome && (
                            <button
                                onClick={onGoHome}
                                className="px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-all duration-200"
                            >
                                <Home size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
