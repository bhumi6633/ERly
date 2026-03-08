"use client";

import { useState, memo, useEffect } from "react";
/* eslint-disable @next/next/no-img-element */
import { X, MapPin, ShieldCheck, Navigation, Navigation2, Phone } from "lucide-react";
import { formatMinutes } from "@/lib/utils";
import type { FacilityDetails, WaitTimeSnapshot } from "@/lib/types";

interface FacilityDetailsPanelProps {
    facility: FacilityDetails;
    onClose: () => void;
    accessToken: string;
    /** Called when the user presses the GO button — starts navigation */
    onGo?: () => void;
    onShowEvidence?: (snapshot: WaitTimeSnapshot) => void;
    showReportButton?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string }> = {
    high:   { label: "HIGH",   color: "text-emerald-400" },
    medium: { label: "MEDIUM", color: "text-amber-400"   },
    low:    { label: "LOW",    color: "text-red-400"      },
};

export const FacilityDetailsPanel = memo(function FacilityDetailsPanel({
    facility,
    onClose,
    accessToken,
    onGo,
    onShowEvidence,
    showReportButton = true,
}: FacilityDetailsPanelProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [evidenceSnapshot, setEvidenceSnapshot] = useState<WaitTimeSnapshot | null>(null);
    const [evidenceLoading, setEvidenceLoading] = useState(false);

    const [lng, lat] = facility.coordinates;
    const staticImageUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},16,0,45/400x267@2x?access_token=${accessToken}`;

    // Fetch wait time evidence when panel opens
    useEffect(() => {
        let cancelled = false;

        async function fetchEvidence() {
            setEvidenceLoading(true);
            try {
                // If we have a direct location ID, use it
                if (facility.locationId != null) {
                    const res = await fetch(`${API_URL}/wait-times/${facility.locationId}`);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data: WaitTimeSnapshot = await res.json();
                    if (!cancelled) setEvidenceSnapshot(data);
                    return;
                }
                // Otherwise search all snapshots and match by location name
                const res = await fetch(`${API_URL}/wait-times/`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const all: WaitTimeSnapshot[] = await res.json();
                const match = all.find(
                    (s) => s.care_location?.name?.toLowerCase() === facility.name.toLowerCase()
                );
                if (!cancelled) setEvidenceSnapshot(match ?? null);
            } catch {
                if (!cancelled) setEvidenceSnapshot(null);
            } finally {
                if (!cancelled) setEvidenceLoading(false);
            }
        }

        fetchEvidence();
        return () => { cancelled = true; };
    }, [facility.name, facility.locationId]);

    return (
        <div className="absolute right-4 top-[72px] z-10 w-[18vw] min-w-[300px] max-w-[340px] flex flex-col glass rounded-2xl overflow-hidden animate-slideInRight">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/60 hover:text-white/80 transition-colors"
            >
                <X size={14} />
            </button>

            {/* Satellite Image */}
            <div className="relative w-full aspect-3/2 bg-gray-900 shrink-0 overflow-hidden">
                {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 skeleton-shimmer" />
                )}
                {imageError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-white/60 text-sm">Image unavailable</div>
                    </div>
                ) : (
                    <img
                        src={staticImageUrl}
                        alt={`${facility.name} aerial view`}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                    />
                )}

                {/* Type Badge */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 border border-white/[0.12] text-white/75 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm">
                    {facility.type}
                </div>
            </div>

            {/* Scrollable details */}
            <div className="p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                {/* Name */}
                <h3 className="text-white font-semibold text-[15px] leading-tight pr-6">
                    {facility.name}
                </h3>

                {/* Address */}
                <div className="flex items-start gap-1.5 text-white/65 text-xs mt-1.5">
                    <MapPin size={11} className="mt-0.5 shrink-0 text-white/50" />
                    <span>{facility.address}</span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                    {facility.waitTime && (
                        <div className="px-2.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/70 mb-0.5">
                                Wait
                            </div>
                            <div className="text-sm font-semibold text-white tabular-nums leading-tight">{facility.waitTime}</div>
                        </div>
                    )}
                    {facility.travelTimeMinutes != null && (
                        <div className="px-2.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/70 mb-0.5">
                                Drive
                            </div>
                            <div className="text-sm font-semibold text-white tabular-nums leading-tight">
                                {formatMinutes(facility.travelTimeMinutes)}
                            </div>
                        </div>
                    )}
                    {facility.distance && (
                        <div className="px-2.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/70 mb-0.5">
                                Away
                            </div>
                            <div className="text-sm font-semibold text-white tabular-nums leading-tight">{facility.distance}</div>
                        </div>
                    )}
                </div>

                {/* Total time to care */}
                {facility.totalTimeMinutes != null && (
                    <div className="mt-3 px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/70 mb-1">
                            Time to Care
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-white tabular-nums">
                                {Math.round(facility.totalTimeMinutes)}
                            </span>
                            <span className="text-sm text-white/60 font-medium">min</span>
                        </div>
                        {facility.travelTimeMinutes != null && (
                            <div className="text-[10px] text-white/70 font-mono mt-0.5">
                                {formatMinutes(facility.travelTimeMinutes)} drive
                                {" · "}
                                {formatMinutes(Math.round(facility.totalTimeMinutes - facility.travelTimeMinutes))} wait
                            </div>
                        )}
                    </div>
                )}

                {/* View Evidence Button → opens modal */}
                <button
                    onClick={() => evidenceSnapshot && onShowEvidence?.(evidenceSnapshot)}
                    disabled={!evidenceSnapshot && !evidenceLoading}
                    className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="flex items-center gap-2 text-white/70">
                        <ShieldCheck size={14} className="text-cyan-400" />
                        View Evidence
                    </span>
                    <span className="flex items-center gap-1">
                        {evidenceLoading ? (
                            <span className="text-[10px] text-white/65 font-mono animate-pulse">loading…</span>
                        ) : evidenceSnapshot ? (
                            (() => {
                                const cfg = CONFIDENCE_CONFIG[evidenceSnapshot.confidence_label] ?? CONFIDENCE_CONFIG.low;
                                return (
                                    <span className={`text-[10px] font-mono ${cfg.color}`}>
                                        {cfg.label}
                                    </span>
                                );
                            })()
                        ) : (
                            <span className="text-[10px] text-white/60 font-mono">no data</span>
                        )}
                    </span>
                </button>

                {/* Actions */}
                <div className="mt-4 space-y-2">
                    {facility.phone && (
                        <a
                            href={`tel:${facility.phone}`}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-white/70 hover:text-white transition-colors text-sm font-medium border border-white/[0.07]"
                        >
                            <Phone size={15} />
                            <span>{facility.phone}</span>
                        </a>
                    )}
                    {onGo && (
                        <button
                            onClick={onGo}
                            className="w-full flex items-center justify-center gap-2.5 px-4 py-[14px] rounded-xl bg-[#1a0505] hover:bg-[#240808] border border-red-900/55 hover:border-red-800/75 text-red-400 hover:text-red-300 font-bold text-sm uppercase tracking-[0.22em] shadow-[0_2px_20px_rgba(220,38,38,0.08)] hover:shadow-[0_2px_25px_rgba(220,38,38,0.14)] active:scale-[0.98] transition-all duration-200"
                        >
                            <Navigation2 size={15} />
                            <span>GO</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});
