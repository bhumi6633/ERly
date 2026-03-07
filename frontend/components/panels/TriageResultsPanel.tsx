"use client";

import { memo } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { URGENCY_CONFIG } from "@/lib/constants";
import type { TriageResult, TriageFacility } from "@/lib/types";

interface TriageResultsPanelProps {
    result: TriageResult;
    onClose: () => void;
    onFacilitySelect: (facility: TriageFacility) => void;
}

export const TriageResultsPanel = memo(function TriageResultsPanel({
    result,
    onClose,
    onFacilitySelect,
}: TriageResultsPanelProps) {
    const urgency = URGENCY_CONFIG[result.urgency];

    return (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-80 max-h-[70vh] flex flex-col glass rounded-2xl overflow-hidden animate-slideInLeft">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
                <h3 className="text-white font-semibold text-sm tracking-wide">
                    Triage Assessment
                </h3>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all duration-200"
                >
                    <Cross2Icon width={14} height={14} />
                </button>
            </div>

            {/* Urgency Badge */}
            <div className="p-4 border-b border-white/[0.08]">
                <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${urgency.bg} ${urgency.border} border ${urgency.glow ? "animate-pulseGlow" : ""}`}
                >
                    <span>{urgency.icon}</span>
                    <span className={urgency.color}>{urgency.label}</span>
                </div>
                <p className="text-white/60 text-sm mt-3 leading-relaxed">
                    {result.summary}
                </p>
                <div className="mt-2 text-xs text-white/40">
                    Recommended: <span className="text-white/70 font-medium">{result.careType}</span>
                </div>
                <div className="mt-3 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-blue-300 text-xs leading-relaxed">
                        <strong>Note:</strong> Facilities ranked by Care Access Time = optimal waiting time + proximity from your location
                    </p>
                </div>
            </div>

            {/* Facilities List - SCROLLABLE */}
            <div className="flex-1 overflow-y-auto p-3 max-h-[400px]">
                <div className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2 px-1">
                    Nearby Facilities ({result.facilities.length})
                </div>
                <div className="flex flex-col gap-1.5">
                    {result.facilities.map((facility) => (
                        <button
                            key={facility.id}
                            onClick={() => onFacilitySelect(facility)}
                            className="w-full text-left px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 group"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-white text-sm font-medium truncate">
                                    {facility.name}
                                </span>
                                {facility.waitTime && (
                                    <span className="text-xs text-emerald-400/80 font-medium shrink-0 ml-2">
                                        {facility.waitTime}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-white/35 text-xs">{facility.type}</span>
                                <span className="text-white/15">·</span>
                                <span className="text-white/35 text-xs">{facility.distance}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
});
