"use client";

import { memo, useState, useEffect, useRef } from "react";
import { X, Check, ChevronRight, AlertCircle, ArrowLeft, ArrowRight, ArrowUp, CornerDownLeft, CornerDownRight, Circle } from "lucide-react";
import { formatMinutes } from "@/lib/utils";
import type { NavigationData, NavigationStep } from "@/lib/types";

function formatDistance(meters: number): string {
    if (meters < 50) return "arrive";
    if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

/** Map Mapbox maneuver type+modifier → icon + label */
function TurnIcon({ step }: { step: NavigationStep }) {
    const mod = step.modifier ?? "";
    const type = step.type ?? "";

    if (type === "arrive") return <Circle size={26} className="text-emerald-400" />;
    if (type === "depart")  return <ArrowUp  size={26} className="text-sky-400" />;
    if (mod.includes("sharp left") || mod.includes("uturn-left")) return <CornerDownLeft  size={26} className="text-sky-400" />;
    if (mod.includes("sharp right") || mod.includes("uturn-right")) return <CornerDownRight size={26} className="text-sky-400" />;
    if (mod.includes("left"))  return <ArrowLeft  size={26} className="text-sky-400" />;
    if (mod.includes("right")) return <ArrowRight size={26} className="text-sky-400" />;
    return <ArrowUp size={26} className="text-sky-400" />;
}

interface NavigationPanelProps {
    data: NavigationData;
    onStop: () => void;
}

export const NavigationPanel = memo(function NavigationPanel({
    data,
    onStop,
}: NavigationPanelProps) {
    const { facilityName, etaMinutes, distanceKm, steps, patientId, preArrivalSent } = data;

    // ── Simulated step progression ──
    const [stepIndex, setStepIndex] = useState(0);
    const stepIndexRef = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (steps.length <= 1) return;
        // Advance one step every ~12 s during demo
        intervalRef.current = setInterval(() => {
            stepIndexRef.current += 1;
            if (stepIndexRef.current >= steps.length) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                return;
            }
            setStepIndex(stepIndexRef.current);
        }, 12_000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [steps.length]);

    const currentStep: NavigationStep | undefined = steps[stepIndex];
    const nextStep: NavigationStep | undefined = steps[stepIndex + 1];
    const remaining = steps.length - stepIndex;

    return (
        <div className="absolute inset-0 z-20 pointer-events-none">

            {/* ── Top navigation bar (slides down from top) ── */}
            <div className="pointer-events-auto absolute top-0 left-0 right-0 z-30 animate-slideDown">
                <div className="flex items-center gap-4 px-5 py-3.5 bg-[#050505]/96 backdrop-blur-2xl border-b border-white/[0.07]">

                    {/* Pulsing status + destination */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-70" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400" />
                        </span>
                        <div className="min-w-0">
                            <div className="text-[9px] uppercase tracking-[0.3em] font-bold text-sky-400/60 mb-0.5 leading-none">Navigating to</div>
                            <div className="text-white font-bold text-[15px] leading-tight truncate">{facilityName}</div>
                        </div>
                    </div>

                    {/* ETA */}
                    <div className="text-right shrink-0 border-l border-white/[0.06] pl-4">
                        <div className="text-[21px] font-bold text-white tabular-nums leading-none">{formatMinutes(etaMinutes)}</div>
                        <div className="text-[10px] text-white/30 tabular-nums mt-0.5">{distanceKm.toFixed(1)} km · traffic</div>
                    </div>

                    {/* Stop */}
                    <button
                        onClick={onStop}
                        className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1c0505]/80 hover:bg-[#2a0808]/80 border border-red-900/40 hover:border-red-800/60 text-red-500/80 hover:text-red-400 transition-all duration-200 text-[11px] font-bold uppercase tracking-wider"
                    >
                        <X size={12} />
                        Stop
                    </button>
                </div>
            </div>

            {/* ── Bottom instruction sheet (slides up from bottom) ── */}
            <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-30 animate-slideUp">
                <div className="bg-[#050505]/97 backdrop-blur-2xl border-t border-white/[0.06] rounded-t-[2rem] overflow-hidden">

                    {/* ── Current turn — hero block ── */}
                    <div className="px-6 pt-7 pb-5">
                        <div className="flex items-center gap-4">
                            {/* Turn icon */}
                            <div className="w-[66px] h-[66px] rounded-2xl bg-sky-500/[0.08] border border-sky-500/[0.18] flex items-center justify-center shrink-0">
                                {currentStep ? (
                                    <TurnIcon step={currentStep} />
                                ) : (
                                    <Check size={26} className="text-emerald-400" />
                                )}
                            </div>

                            {/* Instruction */}
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-bold text-[22px] leading-tight">
                                    {currentStep?.instruction ?? `Head to ${facilityName}`}
                                </div>
                                {currentStep && currentStep.distanceMeters > 50 && (
                                    <div className="text-white/35 text-base mt-2 font-mono tabular-nums">
                                        in {formatDistance(currentStep.distanceMeters)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Next step pill ── */}
                    {nextStep && (
                        <div className="mx-6 mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <ChevronRight size={14} className="text-white/25 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <span className="text-[8px] uppercase tracking-[0.25em] font-bold text-white/30 block mb-0.5">Then</span>
                                <span className="text-[13px] text-white/55 leading-snug">{nextStep.instruction}</span>
                            </div>
                            <span className="text-[10px] text-white/25 font-mono tabular-nums shrink-0">{formatDistance(nextStep.distanceMeters)}</span>
                        </div>
                    )}

                    {/* ── Divider ── */}
                    <div className="h-px bg-white/[0.05] mx-6" />

                    {/* ── Status row: notified + steps remaining ── */}
                    <div className="flex items-center gap-3 px-6 py-4">
                        {preArrivalSent ? (
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                    <Check size={11} className="text-emerald-400" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-emerald-300 font-semibold text-sm">Facility notified</span>
                                    {patientId && (
                                        <span className="text-emerald-400/35 text-[10px] font-mono ml-2">{patientId}</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 flex-1">
                                <AlertCircle size={13} className="text-amber-400/60 shrink-0" />
                                <span className="text-amber-400/55 text-[11px]">Offline mode</span>
                            </div>
                        )}

                        {remaining > 1 && (
                            <div className="text-white/25 text-[11px] font-mono shrink-0">
                                {remaining - 1} turn{remaining - 1 !== 1 ? "s" : ""} left
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
});

