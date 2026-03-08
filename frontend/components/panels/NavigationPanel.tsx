"use client";

import { memo, useState, useEffect, useRef } from "react";
import {
    X, Check, ChevronUp,
    ArrowLeft, ArrowRight, ArrowUp, CornerDownLeft, CornerDownRight,
    RotateCcw, Circle,
    Crosshair, Map as MapIcon, Radio,
} from "lucide-react";
import {
    formatDistance,
    formatEta,
    getTurnDirection,
    type TurnDirection,
} from "@/lib/navigation-utils";
import type { NavigationData, NavigationStep } from "@/lib/types";

// ── Turn arrow icon ───────────────────────────────────────────────────────────

function TurnArrow({ direction, size = 36 }: { direction: TurnDirection; size?: number }) {
    const cls = `shrink-0 text-white drop-shadow`;
    switch (direction) {
        case "arrive":      return <Circle        size={size} className={`${cls} text-emerald-300`} />;
        case "depart":      return <ArrowUp       size={size} className={cls} />;
        case "uturn":       return <RotateCcw     size={size} className={cls} />;
        case "sharp-left":  return <CornerDownLeft  size={size} className={cls} />;
        case "sharp-right": return <CornerDownRight size={size} className={cls} />;
        case "left":        return <ArrowLeft     size={size} className={cls} />;
        case "right":       return <ArrowRight    size={size} className={cls} />;
        default:            return <ArrowUp       size={size} className={cls} />;
    }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface NavigationPanelProps {
    data: NavigationData;
    onStop: () => void;
    onRecenter?: () => void;
    onOverview?: () => void;
    showTraffic?: boolean;
    onToggleTraffic?: () => void;
}

export const NavigationPanel = memo(function NavigationPanel({
    data,
    onStop,
    onRecenter,
    onOverview,
    showTraffic = false,
    onToggleTraffic,
}: NavigationPanelProps) {
    const { facilityName, etaMinutes, distanceKm, steps, patientId, preArrivalSent } = data;

    // ── Step progression: advance one step every ~12 s (demo) ────────────────
    const [stepIndex, setStepIndex] = useState(0);
    const stepRef = useRef(0);
    useEffect(() => {
        if (steps.length <= 1) return;
        const id = setInterval(() => {
            stepRef.current += 1;
            if (stepRef.current >= steps.length) { clearInterval(id); return; }
            setStepIndex(stepRef.current);
        }, 12_000);
        return () => clearInterval(id);
    }, [steps.length]);

    // ── Simulated live speed (km/h) ───────────────────────────────────────────
    const baseSpeed = Math.max(10, Math.round((distanceKm / Math.max(1, etaMinutes)) * 60));
    const [speed, setSpeed] = useState(baseSpeed);
    useEffect(() => {
        const id = setInterval(() => {
            setSpeed(Math.max(5, baseSpeed + Math.round((Math.random() - 0.5) * 12)));
        }, 3_000);
        return () => clearInterval(id);
    }, [baseSpeed]);

    const currentStep: NavigationStep | undefined = steps[stepIndex];
    const nextStep: NavigationStep | undefined    = steps[stepIndex + 1];
    const stepsLeft = steps.length - stepIndex - 1;

    const currentDir = currentStep
        ? getTurnDirection(currentStep.type ?? "", currentStep.modifier)
        : "straight";
    const nextDir = nextStep
        ? getTurnDirection(nextStep.type ?? "", nextStep.modifier)
        : null;

    return (
        <div className="absolute inset-0 z-[60] pointer-events-none">

            {/* ── TOP-LEFT: Turn instruction card (≈ Apple Maps / Google Maps style) ── */}
            <div className="pointer-events-auto absolute top-4 left-4 z-30">

                {/* Main turn card */}
                <div className="flex items-stretch rounded-[22px] overflow-hidden shadow-2xl"
                    style={{ background: "linear-gradient(135deg,#1565C0 0%,#0D47A1 100%)" }}>

                    {/* Arrow column */}
                    <div className="flex items-center justify-center px-5 py-4 bg-black/20">
                        <TurnArrow direction={currentDir} size={42} />
                    </div>

                    {/* Distance + street */}
                    <div className="px-4 py-4 min-w-[140px] max-w-[220px]">
                        <div className="text-white font-black tabular-nums leading-none"
                            style={{ fontSize: "clamp(1.5rem,5vw,2rem)" }}>
                            {currentStep
                                ? formatDistance(currentStep.distanceMeters)
                                : formatEta(etaMinutes)}
                        </div>
                        <div className="text-white/80 text-sm mt-1 leading-tight line-clamp-2">
                            {currentStep?.instruction ?? `Head to ${facilityName}`}
                        </div>
                    </div>

                    {/* Speed chip (right side of card) */}
                    <div className="flex flex-col items-center justify-center px-4 bg-black/15 min-w-[54px]">
                        <span className="text-white font-bold text-xl tabular-nums leading-none">{speed}</span>
                        <span className="text-white/50 text-[9px] uppercase tracking-widest mt-0.5">km/h</span>
                    </div>
                </div>

                {/* Next-step pill */}
                {nextStep && nextDir && (
                    <div className="mt-2 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#0a0a0a]/85 backdrop-blur-lg border border-white/[0.08] shadow-lg">
                        <span className="text-white/40 text-[10px] uppercase tracking-wider shrink-0">Then</span>
                        <TurnArrow direction={nextDir} size={16} />
                        <span className="text-white/65 text-[13px] truncate flex-1">{nextStep.instruction}</span>
                        <span className="text-white/35 text-[11px] font-mono tabular-nums shrink-0">
                            {formatDistance(nextStep.distanceMeters)}
                        </span>
                    </div>
                )}

                {/* Steps remaining pill */}
                {stepsLeft > 1 && (
                    <div className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a0a0a]/70 border border-white/[0.07] w-fit">
                        <ChevronUp size={12} className="text-white/30" />
                        <span className="text-white/35 text-[11px] font-mono tabular-nums">
                            {stepsLeft} turn{stepsLeft !== 1 ? "s" : ""} remaining
                        </span>
                    </div>
                )}
            </div>

            {/* ── RIGHT SIDE: floating map controls ── */}
            <div className="pointer-events-auto absolute right-4 z-30 flex flex-col gap-2"
                style={{ top: "50%", transform: "translateY(-50%)" }}>

                {onRecenter && (
                    <button onClick={onRecenter} title="Re-center"
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#0d0d0d]/90 hover:bg-sky-600/25 backdrop-blur-lg border border-white/[0.12] hover:border-sky-500/40 text-sky-400 hover:text-sky-300 shadow-lg transition-all duration-200 active:scale-95">
                        <Crosshair size={18} />
                    </button>
                )}

                {onOverview && (
                    <button onClick={onOverview} title="Route overview"
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#0d0d0d]/90 hover:bg-white/[0.08] backdrop-blur-lg border border-white/[0.12] text-white/60 hover:text-white/90 shadow-lg transition-all duration-200 active:scale-95">
                        <MapIcon size={18} />
                    </button>
                )}

                {onToggleTraffic && (
                    <button
                        onClick={onToggleTraffic}
                        title={showTraffic ? "Hide traffic overlay" : "Show live traffic"}
                        className={`w-11 h-11 flex items-center justify-center rounded-xl backdrop-blur-lg border shadow-lg transition-all duration-200 active:scale-95 ${
                            showTraffic
                                ? "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/25"
                                : "bg-[#0d0d0d]/90 border-white/[0.12] text-white/50 hover:text-amber-400/70 hover:bg-[#171717]/90"
                        }`}>
                        <Radio size={18} />
                    </button>
                )}
            </div>

            {/* ── BOTTOM: ETA / arrival strip (Apple Maps style) ── */}
            <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-30 animate-slideUp">
                <div className="bg-[#060606]/97 backdrop-blur-2xl border-t border-white/[0.06] rounded-t-[2rem] px-6 py-5">
                    <div className="flex items-center gap-4">

                        {/* ETA block */}
                        <div className="text-center shrink-0">
                            <div className="text-white font-black text-3xl tabular-nums leading-none">
                                {formatEta(etaMinutes)}
                            </div>
                            <div className="text-white/35 text-[10px] uppercase tracking-wider mt-1">ETA</div>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-10 bg-white/[0.08] shrink-0" />

                        {/* Distance block */}
                        <div className="text-center shrink-0">
                            <div className="text-white font-bold text-xl tabular-nums leading-none">{distanceKm.toFixed(1)} km</div>
                            <div className="text-white/35 text-[10px] uppercase tracking-wider mt-1">remaining</div>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-10 bg-white/[0.08] shrink-0" />

                        {/* Destination + notified badge */}
                        <div className="flex-1 min-w-0">
                            <div className="text-white font-semibold text-sm truncate">{facilityName}</div>
                            {preArrivalSent ? (
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Check size={11} className="text-emerald-400 shrink-0" />
                                    <span className="text-emerald-400 text-[11px] font-medium">Facility notified</span>
                                    {patientId && (
                                        <span className="text-emerald-400/40 text-[10px] font-mono ml-0.5">{patientId}</span>
                                    )}
                                </div>
                            ) : (
                                <div className="text-white/30 text-[11px] mt-1">Offline mode</div>
                            )}
                        </div>

                        {/* Stop button */}
                        <button
                            onClick={onStop}
                            className="shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-red-950/60 hover:bg-red-900/60 border border-red-800/40 hover:border-red-700/50 text-red-400 hover:text-red-300 transition-all duration-200 text-[12px] font-bold uppercase tracking-wider active:scale-95">
                            <X size={14} />
                            Stop
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
});




