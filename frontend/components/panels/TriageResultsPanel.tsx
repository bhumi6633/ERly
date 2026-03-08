"use client";

import { memo } from "react";
import { X, Phone, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/utils";
import { URGENCY_CONFIG } from "@/lib/constants";
import type { TriageResult, TriageFacility } from "@/lib/types";

const URGENCY_DOT: Record<string, string> = {
    emergency: "bg-red-500",
    high: "bg-red-500",
    urgent: "bg-amber-400",
    medium: "bg-amber-400",
    standard: "bg-emerald-500",
    low: "bg-emerald-500",
    "self-care": "bg-sky-400",
};

function TypeChip({ type }: { type: string }) {
    return (
        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/[0.10] text-white/65 border border-white/[0.14]">
            {type}
        </span>
    );
}

interface TriageResultsPanelProps {
    result: TriageResult;
    isRefetching?: boolean;
    onClose: () => void;
    onFacilitySelect: (facility: TriageFacility) => void;
}

export const TriageResultsPanel = memo(function TriageResultsPanel({
    result,
    isRefetching = false,
    onClose,
    onFacilitySelect,
}: TriageResultsPanelProps) {
    const urgency = URGENCY_CONFIG[result.urgency];
    const dotColor = URGENCY_DOT[result.urgency] ?? "bg-white/40";

    return (
        <aside className="absolute left-4 top-[72px] z-10 w-80 max-h-[calc(100vh-172px)] flex flex-col glass rounded-2xl overflow-hidden animate-slideInLeft">

            {/* ── Panel header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] shrink-0">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-white/60 mb-1.5">
                        ERly · Triage
                    </div>
                    <div className="flex items-center gap-2.5">
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotColor)} />
                        <span className="text-white font-bold text-[15px]">{urgency.label}</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/60 hover:text-white/70 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            {/* ── Assessment summary ── */}
            <div className="px-5 py-3.5 border-b border-white/[0.07] shrink-0">
                <p className="text-white/75 text-xs leading-relaxed">{result.summary}</p>
                <div className="flex items-baseline gap-1.5 mt-2.5">
                    <span className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Recommended</span>
                    <span className="text-xs font-semibold text-white/80">{result.careType}</span>
                </div>
            </div>

            {/* ── Time Saved vs ER banner ── */}
            {result.timeSavedMinutes && result.timeSavedMinutes > 30 && (
                <div className="px-5 py-4 border-b border-emerald-500/25 bg-emerald-500/[0.12] shrink-0">
                    <div className="text-[9px] uppercase tracking-[0.25em] font-bold text-emerald-400/80 mb-1.5">
                        vs Nearest ER
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-emerald-300 tabular-nums leading-none animate-timeSavedReveal animate-timeSavedPulse">
                            {formatMinutes(result.timeSavedMinutes)}
                        </span>
                        <span className="text-sm font-bold text-emerald-400/70">saved</span>
                    </div>
                    <div className="text-[10px] text-white/60 mt-1.5">
                        {result.nearestErTotalMinutes
                            ? `ER: ~${formatMinutes(result.nearestErTotalMinutes)} · Your care: ~${formatMinutes((result.nearestErTotalMinutes ?? 0) - result.timeSavedMinutes)}`
                            : `by choosing ${result.careType} instead`}
                    </div>
                </div>
            )}

            {/* ── Facilities list ── */}
            <div className="flex-1 overflow-y-auto min-h-0 relative">
                {isRefetching && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-sm">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                        <span className="text-white/70 text-[10px] uppercase tracking-widest font-bold">Searching…</span>
                    </div>
                )}
                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-white/70">
                        Nearby Facilities
                    </span>
                    <span className="text-[10px] text-white/60 font-mono tabular-nums">{result.facilities.length}</span>
                </div>

                <ul className="px-3 pb-4 space-y-0.5">
                    {result.facilities.length === 0 && (
                        <li className="px-3 py-8 text-center">
                            <p className="text-white/60 text-xs">No facilities match this filter.</p>
                            <p className="text-white/45 text-[10px] mt-1">Try selecting a different category above.</p>
                        </li>
                    )}
                    {result.facilities.map((facility, idx) => {
                        const isTelehealth = facility.type === "telehealth";
                        const totalMin = facility.totalTimeMinutes;
                        const driveMin = facility.travelTimeMinutes;
                        const waitMin =
                            totalMin != null && driveMin != null
                                ? Math.round(totalMin - driveMin)
                                : null;

                        if (isTelehealth) {
                            return (
                                <li key={facility.id}>
                                    <div className="px-3 py-3 rounded-xl border border-white/[0.07] bg-white/[0.03] mb-1">
                                        <div className="flex items-start gap-2 min-w-0 mb-2">
                                            <span className="text-[10px] font-mono text-white/50 shrink-0 mt-0.5 w-4 text-right select-none">
                                                {idx + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <span className="text-sm font-semibold text-white leading-snug block truncate">
                                                    {facility.name}
                                                </span>
                                                <span className="text-[11px] text-white/55 mt-0.5 block">{facility.address}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pl-6">
                                            {facility.phone && (
                                                <a
                                                    href={`tel:${facility.phone}`}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/80 hover:text-white text-[11px] font-medium transition-colors border border-white/[0.08]"
                                                >
                                                    <Phone size={11} />
                                                    {facility.phone}
                                                </a>
                                            )}
                                            {facility.website && (
                                                <a
                                                    href={facility.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/80 hover:text-white text-[11px] font-medium transition-colors border border-white/[0.08]"
                                                >
                                                    <ExternalLink size={11} />
                                                    Visit site
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        }

                        return (
                            <li key={facility.id}>
                                <button
                                    onClick={() => onFacilitySelect(facility)}
                                    className="w-full text-left px-3 py-3 rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-white/[0.09] transition-all duration-150 group"
                                >
                                    {/* Row 1: index + name + total time */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2 min-w-0">
                                            <span className="text-[10px] font-mono text-white/45 shrink-0 mt-0.5 w-4 text-right select-none">
                                                {idx + 1}
                                            </span>
                                            <span className="text-[13px] font-semibold text-white/90 leading-snug group-hover:text-white truncate">
                                                {facility.name}
                                            </span>
                                        </div>
                                        {totalMin != null && (
                                            <div className="shrink-0 text-right leading-none">
                                                <div className="text-sm font-bold text-white tabular-nums">
                                                    {formatMinutes(totalMin)}
                                                </div>
                                                <div className="text-[8px] uppercase tracking-wider text-white/55 font-bold mt-0.5">
                                                    total
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Row 2: type chip + distance + breakdown */}
                                    <div className="flex items-center gap-1.5 mt-2 pl-6 flex-wrap">
                                        <TypeChip type={facility.type} />
                                        {facility.distance && (
                                            <>
                                                <span className="text-white/50 text-xs">·</span>
                                                <span className="text-white/70 text-[11px]">{facility.distance}</span>
                                            </>
                                        )}
                                        {driveMin != null && waitMin != null && (
                                            <>
                                                <span className="text-white/50 text-xs">·</span>
                                                <span className="text-white/75 text-[10px] font-mono">
                                                    {formatMinutes(driveMin)}{" + "}{formatMinutes(waitMin)} wait
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* ── Footer ── */}
            <div className="px-5 py-3 border-t border-white/[0.07] shrink-0">
                <p className="text-[10px] text-white/65 leading-relaxed">
                    {result.careType === "Telehealth"
                        ? "Virtual care services. Not a substitute for emergency care."
                        : "Ranked by drive + wait. Sources: live hospital feeds, public aggregators, CIHI benchmarks."}
                </p>
            </div>
        </aside>
    );
});
