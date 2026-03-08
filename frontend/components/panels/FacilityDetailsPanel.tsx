"use client";

import { useState, memo, useEffect } from "react";
/* eslint-disable @next/next/no-img-element */
import { Cross2Icon, DrawingPinIcon, ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { Phone, Clock, Navigation, ShieldCheck, AlertTriangle, HelpCircle } from "lucide-react";
import type { FacilityDetails, WaitTimeSnapshot } from "@/lib/types";

interface FacilityDetailsPanelProps {
    facility: FacilityDetails;
    onClose: () => void;
    accessToken: string;
    onShowRoute?: () => void;
    showReportButton?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    high:   { label: "HIGH",   color: "text-emerald-400", icon: <ShieldCheck size={12} /> },
    medium: { label: "MEDIUM", color: "text-amber-400",   icon: <AlertTriangle size={12} /> },
    low:    { label: "LOW",    color: "text-red-400",      icon: <HelpCircle size={12} /> },
};

const EVIDENCE_TIER_LABELS: Record<string, string> = {
    official_api_feed:          "OFFICIAL FEED",
    official_browser_dashboard: "OFFICIAL DASHBOARD",
    public_aggregator_page:     "PUBLIC AGGREGATOR",
    provincial_benchmark:       "BENCHMARK MODEL",
    care_setting_proxy:         "PROXY FLOOR",
    transparent_heuristic:      "HEURISTIC MODEL",
    insufficient_evidence:      "NO DATA SOURCE",
};

function EvidencePanel({ snapshot }: { snapshot: WaitTimeSnapshot }) {
    const [openRecord, setOpenRecord] = useState<number | null>(0);

    const primary = snapshot.source_records[0] ?? null;
    const primaryMeta = primary?.metadata_json
        ? (() => { try { return JSON.parse(primary.metadata_json); } catch { return {}; } })()
        : {};

    const tier = primaryMeta.evidence_tier as string | undefined;
    const tierLabel = tier ? (EVIDENCE_TIER_LABELS[tier] ?? tier.toUpperCase()) : "UNKNOWN";

    return (
        <div className="mt-3 border-t border-white/[0.08] pt-3 space-y-3">
            {/* Confidence + tier badges */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[10px] font-mono text-white/60 border border-white/[0.08]">
                    {tierLabel}
                </span>
                {(() => {
                    const cfg = CONFIDENCE_CONFIG[snapshot.confidence_label] ?? CONFIDENCE_CONFIG.low;
                    return (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] text-[10px] font-mono border border-white/[0.08] ${cfg.color}`}>
                            {cfg.icon}
                            CONFIDENCE {cfg.label} ({snapshot.confidence_score.toFixed(2)})
                        </span>
                    );
                })()}
            </div>

            {/* Wait range */}
            {snapshot.overall_wait_minutes != null && (
                <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs font-mono">
                    <span className="text-white/40">PREDICTED WAIT </span>
                    <span className="text-white font-semibold">{snapshot.overall_wait_minutes}m</span>
                    {snapshot.overall_wait_min_minutes != null && snapshot.overall_wait_max_minutes != null && (
                        <span className="text-white/50">
                            {" "}({snapshot.overall_wait_min_minutes}–{snapshot.overall_wait_max_minutes}m range)
                        </span>
                    )}
                </div>
            )}

            {/* Source records */}
            {snapshot.source_records.length > 0 && (
                <div className="space-y-1">
                    <div className="text-[10px] text-white/30 uppercase tracking-wider font-medium px-1">
                        Source Records
                    </div>
                    {snapshot.source_records.map((rec, idx) => {
                        const meta = rec.metadata_json
                            ? (() => { try { return JSON.parse(rec.metadata_json); } catch { return {}; } })()
                            : {};
                        const isOpen = openRecord === idx;
                        return (
                            <div key={idx} className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                                <button
                                    onClick={() => setOpenRecord(isOpen ? null : idx)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
                                >
                                    <span className="text-[11px] text-white/70 font-mono">{rec.source_kind}</span>
                                    <span className="flex items-center gap-1.5 text-[10px] text-white/40">
                                        <span className="text-white/50">conf {rec.confidence_score.toFixed(2)}</span>
                                        {isOpen ? <ChevronUpIcon width={12} /> : <ChevronDownIcon width={12} />}
                                    </span>
                                </button>
                                {isOpen && (
                                    <div className="px-3 pb-3 space-y-2 border-t border-white/[0.06]">
                                        {/* Source URL */}
                                        {meta.source_url && (
                                            <div className="mt-2">
                                                <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Source URL</div>
                                                <a
                                                    href={meta.source_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-cyan-400 hover:text-cyan-300 break-all font-mono"
                                                >
                                                    {meta.source_url}
                                                </a>
                                            </div>
                                        )}
                                        {/* Raw dashboard text */}
                                        {meta.raw_dashboard_text && (
                                            <div>
                                                <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Raw Dashboard Text</div>
                                                <pre className="text-[9px] text-white/60 bg-black/30 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                                                    {meta.raw_dashboard_text}
                                                </pre>
                                            </div>
                                        )}
                                        {/* Benchmark formula */}
                                        {meta.formula_explanation && (
                                            <div>
                                                <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Formula</div>
                                                <pre className="text-[9px] text-emerald-300/70 bg-black/30 rounded-lg p-2 font-mono">
                                                    {meta.formula_explanation}
                                                </pre>
                                            </div>
                                        )}
                                        {/* Formula inputs */}
                                        {meta.formula_inputs && typeof meta.formula_inputs === "object" && (
                                            <div>
                                                <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Formula Inputs</div>
                                                <div className="space-y-1">
                                                    {Object.entries(meta.formula_inputs as Record<string, { value: number; source_citation: string }>).map(([k, v]) => (
                                                        <div key={k} className="text-[9px] font-mono">
                                                            <span className="text-emerald-300/80">{k}</span>
                                                            <span className="text-white/50"> = {v?.value}</span>
                                                            {v?.source_citation && (
                                                                <div className="text-white/30 pl-2 text-[8px] leading-relaxed mt-0.5">{v.source_citation}</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Raw JSON payload for official API feeds */}
                                        {meta.raw_payload && (
                                            <div>
                                                <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Raw API Payload</div>
                                                <pre className="text-[9px] text-white/60 bg-black/30 rounded-lg p-2 overflow-x-auto font-mono leading-relaxed max-h-48">
                                                    {JSON.stringify({
                                                        averageTimeToSeeDoctor: meta.raw_payload.averageTimeToSeeDoctor,
                                                        averageTimeToSeeDoctor80th: meta.raw_payload.averageTimeToSeeDoctor80th,
                                                        patientsWaitingToSeeDoctor: meta.raw_payload.patientsWaitingToSeeDoctor,
                                                        activePatients: meta.raw_payload.activePatients,
                                                        activeNoBedAdmits: meta.raw_payload.activeNoBedAdmits,
                                                        lastUpdated: meta.raw_payload.lastUpdated,
                                                    }, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                        {/* SHA256 fingerprint */}
                                        {meta.source_fingerprint_sha256 && (
                                            <div className="text-[9px] font-mono text-white/25 break-all">
                                                sha256: {meta.source_fingerprint_sha256}
                                            </div>
                                        )}
                                        {/* Last reported */}
                                        <div className="text-[9px] text-white/30 font-mono">
                                            reported_at: {rec.reported_at}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CTAS scenarios */}
            {snapshot.scenarios.length > 0 && (
                <div>
                    <div className="text-[10px] text-white/30 uppercase tracking-wider font-medium px-1 mb-1">
                        Scenario Breakdown
                    </div>
                    <div className="space-y-1">
                        {snapshot.scenarios.map((s, idx) => (
                            <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                                <span className="text-[10px] text-white/60 truncate mr-2">{s.label}</span>
                                <span className="text-[10px] font-mono text-white/80 shrink-0">
                                    {s.wait_minutes != null
                                        ? `${s.wait_minutes}m`
                                        : "immediate"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export const FacilityDetailsPanel = memo(function FacilityDetailsPanel({
    facility,
    onClose,
    accessToken,
    onShowRoute,
    showReportButton = true,
}: FacilityDetailsPanelProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [showEvidence, setShowEvidence] = useState(false);
    const [evidenceSnapshot, setEvidenceSnapshot] = useState<WaitTimeSnapshot | null>(null);
    const [evidenceLoading, setEvidenceLoading] = useState(false);
    const [evidenceError, setEvidenceError] = useState<string | null>(null);

    const [lng, lat] = facility.coordinates;
    const staticImageUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},16,0,45/400x267@2x?access_token=${accessToken}`;

    // Fetch wait time evidence when panel opens
    useEffect(() => {
        let cancelled = false;

        async function fetchEvidence() {
            setEvidenceLoading(true);
            setEvidenceError(null);
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
            } catch (err) {
                if (!cancelled) setEvidenceError("Could not reach backend.");
            } finally {
                if (!cancelled) setEvidenceLoading(false);
            }
        }

        fetchEvidence();
        return () => { cancelled = true; };
    }, [facility.name, facility.locationId]);

    return (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-[18vw] min-w-72 max-w-[340px] flex flex-col glass rounded-2xl overflow-hidden animate-slideInRight">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/50 hover:text-white transition-all duration-200"
            >
                <Cross2Icon width={14} height={14} />
            </button>

            {/* Satellite Image */}
            <div className="relative w-full aspect-3/2 bg-gray-900 shrink-0 overflow-hidden">
                {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 skeleton-shimmer" />
                )}
                {imageError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-950">
                        <div className="text-white/25 text-sm">Image unavailable</div>
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
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/20 text-emerald-300 text-xs font-medium backdrop-blur-sm">
                    {facility.type}
                </div>
            </div>

            {/* Scrollable details */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
                <h3 className="text-white font-semibold text-lg leading-tight">
                    {facility.name}
                </h3>

                <div className="flex items-start gap-2 text-white/50 text-sm mt-2">
                    <DrawingPinIcon width={14} height={14} className="mt-0.5 shrink-0" />
                    <span>{facility.address}</span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                    {facility.waitTime && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <Clock size={14} className="text-emerald-400 shrink-0" />
                            <div>
                                <div className="text-[10px] text-white/35 uppercase tracking-wider">Wait</div>
                                <div className="text-white text-sm font-medium">{facility.waitTime}</div>
                            </div>
                        </div>
                    )}
                    {facility.distance && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <Navigation size={14} className="text-blue-400 shrink-0" />
                            <div>
                                <div className="text-[10px] text-white/35 uppercase tracking-wider">Distance</div>
                                <div className="text-white text-sm font-medium">{facility.distance}</div>
                            </div>
                        </div>
                    )}
                    {facility.travelTimeMinutes != null && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                            <Navigation size={14} className="text-sky-400 shrink-0" />
                            <div>
                                <div className="text-[10px] text-white/35 uppercase tracking-wider">Drive</div>
                                <div className="text-white text-sm font-medium">{facility.travelTimeMinutes}m</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Total time to care — headline stat */}
                {facility.totalTimeMinutes != null && (
                    <div className="mt-3 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-400/20">
                        <div className="text-[10px] text-emerald-300/60 uppercase tracking-wider font-medium mb-0.5">
                            Total time to care
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-emerald-300 text-2xl font-bold">{Math.round(facility.totalTimeMinutes)}m</span>
                            <span className="text-white/40 text-xs font-mono">
                                {facility.travelTimeMinutes != null
                                    ? `${facility.travelTimeMinutes}m drive + ${Math.round(facility.totalTimeMinutes - facility.travelTimeMinutes)}m wait`
                                    : "travel + wait"}
                            </span>
                        </div>
                    </div>
                )}

                {/* View Evidence Button */}
                <button
                    onClick={() => setShowEvidence((v) => !v)}
                    className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] transition-all duration-200 text-sm"
                >
                    <span className="flex items-center gap-2 text-white/70">
                        <ShieldCheck size={14} className="text-cyan-400" />
                        View Evidence
                    </span>
                    <span className="flex items-center gap-1.5">
                        {evidenceLoading ? (
                            <span className="text-[10px] text-white/30 font-mono animate-pulse">loading…</span>
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
                            <span className="text-[10px] text-white/30 font-mono">no live data</span>
                        )}
                        {showEvidence ? <ChevronUpIcon width={12} /> : <ChevronDownIcon width={12} />}
                    </span>
                </button>

                {showEvidence && (
                    evidenceLoading ? (
                        <div className="mt-3 text-[11px] text-white/40 font-mono text-center py-4 animate-pulse">
                            Fetching evidence…
                        </div>
                    ) : evidenceError ? (
                        <div className="mt-3 text-[11px] text-red-400/70 font-mono text-center py-2">
                            {evidenceError}
                        </div>
                    ) : evidenceSnapshot ? (
                        <EvidencePanel snapshot={evidenceSnapshot} />
                    ) : (
                        <div className="mt-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/40 font-mono">
                            No live data source configured for this facility.
                            {"\n"}Confidence: LOW — no official feed or provincially-matched record found.
                        </div>
                    )
                )}

                {/* Actions */}
                <div className="mt-4 space-y-2">
                    {facility.phone && (
                        <a
                            href={`tel:${facility.phone}`}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 transition-all duration-200 text-sm font-medium"
                        >
                            <Phone size={16} />
                            <span>Call {facility.phone}</span>
                        </a>
                    )}
                    {showReportButton && (
                        <button
                            onClick={() => {
                                if (onShowRoute) {
                                    onShowRoute();
                                }
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white transition-all duration-200 text-sm font-semibold"
                        >
                            <Navigation size={16} />
                            <span>REVIEW AND SUBMIT REPORT</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});
