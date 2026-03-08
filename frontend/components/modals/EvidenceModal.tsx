"use client";

import { memo, useState } from "react";
import { X, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, HelpCircle, ExternalLink } from "lucide-react";
import type { WaitTimeSnapshot } from "@/lib/types";

// ── Evidence tier display labels ──────────────────────────────────────────────

const EVIDENCE_TIER_LABELS: Record<string, string> = {
    official_api_feed:          "Official Feed",
    official_browser_dashboard: "Official Dashboard",
    public_aggregator_page:     "Public Aggregator",
    provincial_benchmark:       "Benchmark Model",
    care_setting_proxy:         "Proxy Floor",
    transparent_heuristic:      "Heuristic Model",
    insufficient_evidence:      "No Data Source",
};

const CONFIDENCE_CONFIG: Record<string, {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
}> = {
    high:   { label: "High",   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", icon: <ShieldCheck size={16} /> },
    medium: { label: "Medium", color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/25",   icon: <AlertTriangle size={16} /> },
    low:    { label: "Low",    color: "text-red-400",      bg: "bg-red-500/10",     border: "border-red-500/25",     icon: <HelpCircle size={16} /> },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface EvidenceModalProps {
    facilityName: string;
    snapshot: WaitTimeSnapshot;
    onClose: () => void;
}

// ── Source record accordion item ─────────────────────────────────────────────

function SourceRecord({ record, defaultOpen }: { record: WaitTimeSnapshot["source_records"][0]; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen ?? false);
    const meta = record.metadata_json
        ? (() => { try { return JSON.parse(record.metadata_json); } catch { return {}; } })()
        : {};

    const tierLabel = EVIDENCE_TIER_LABELS[record.source_kind] ?? record.source_kind;

    return (
        <div className="rounded-2xl border border-white/[0.09] bg-white/[0.03] overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/[0.04] transition-colors"
            >
                <span className="text-sm font-medium text-white/75">{tierLabel}</span>
                <span className="flex items-center gap-2 text-xs text-white/45 shrink-0">
                    <span className="font-mono">conf {record.confidence_score.toFixed(2)}</span>
                    {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
            </button>

            {open && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/[0.07]">
                    {meta.source_url && (
                        <div className="mt-3">
                            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1.5">Source URL</div>
                            <a
                                href={meta.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 break-all font-mono group"
                            >
                                <ExternalLink size={11} className="shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                                {meta.source_url}
                            </a>
                        </div>
                    )}
                    {meta.raw_dashboard_text && (
                        <div>
                            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1.5">Raw Dashboard Text</div>
                            <pre className="text-xs text-white/60 bg-black/30 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                                {meta.raw_dashboard_text}
                            </pre>
                        </div>
                    )}
                    {meta.formula_explanation && (
                        <div>
                            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1.5">Formula</div>
                            <pre className="text-xs text-emerald-300/80 bg-black/30 rounded-xl p-3 font-mono leading-relaxed">
                                {meta.formula_explanation}
                            </pre>
                        </div>
                    )}
                    {meta.formula_inputs && typeof meta.formula_inputs === "object" && (
                        <div>
                            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Formula Inputs</div>
                            <div className="space-y-2">
                                {Object.entries(meta.formula_inputs as Record<string, { value: number; source_citation: string }>).map(([k, v]) => (
                                    <div key={k} className="text-xs font-mono">
                                        <span className="text-emerald-300/90">{k}</span>
                                        <span className="text-white/60"> = {v?.value}</span>
                                        {v?.source_citation && (
                                            <div className="text-white/40 pl-3 text-[11px] leading-relaxed mt-0.5">{v.source_citation}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {meta.raw_payload && (
                        <div>
                            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1.5">Raw API Payload</div>
                            <pre className="text-xs text-white/60 bg-black/30 rounded-xl p-3 overflow-x-auto font-mono leading-relaxed max-h-52">
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
                    {meta.source_fingerprint_sha256 && (
                        <div className="text-[10px] font-mono text-white/25 break-all pt-1 border-t border-white/[0.05]">
                            sha256: {meta.source_fingerprint_sha256}
                        </div>
                    )}
                    <div className="text-[11px] text-white/35 font-mono">
                        reported: {record.reported_at}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export const EvidenceModal = memo(function EvidenceModal({
    facilityName,
    snapshot,
    onClose,
}: EvidenceModalProps) {
    const primary = snapshot.source_records[0] ?? null;
    const primaryMeta = primary?.metadata_json
        ? (() => { try { return JSON.parse(primary.metadata_json); } catch { return {}; } })()
        : {};

    const tier = primaryMeta.evidence_tier as string | undefined;
    const tierLabel = tier ? (EVIDENCE_TIER_LABELS[tier] ?? tier) : "Unknown";
    const confidenceCfg = CONFIDENCE_CONFIG[snapshot.confidence_label] ?? CONFIDENCE_CONFIG.low;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            {/* Modal */}
            <div
                className="relative glass rounded-t-[32px] sm:rounded-[32px] w-full sm:max-w-2xl flex flex-col animate-slideUp"
                style={{ maxHeight: "88vh" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 sm:px-8 pt-6 sm:pt-7 pb-5 border-b border-white/[0.08] shrink-0">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/40 mb-2">
                            Wait Time Evidence
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                            {facilityName}
                        </h2>
                        {/* Confidence badge */}
                        <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${confidenceCfg.bg} ${confidenceCfg.border}`}>
                            <span className={confidenceCfg.color}>{confidenceCfg.icon}</span>
                            <span className={`text-sm font-bold ${confidenceCfg.color}`}>
                                {confidenceCfg.label} Confidence
                            </span>
                            <span className="text-xs font-mono text-white/40">
                                {snapshot.confidence_score.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.14] flex items-center justify-center transition-all duration-200 group cursor-pointer"
                        aria-label="Close evidence modal"
                    >
                        <X size={16} className="text-white/60 group-hover:text-white transition-colors group-hover:rotate-90 duration-200" />
                    </button>
                </div>

                {/* Predicted wait summary strip */}
                {snapshot.overall_wait_minutes != null && (
                    <div className="mx-6 sm:mx-8 mt-5 px-5 py-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-baseline gap-3 shrink-0 flex-wrap">
                        <span className="text-3xl font-bold text-white tabular-nums">
                            {snapshot.overall_wait_minutes}
                        </span>
                        <span className="text-base text-white/50 font-medium">min predicted wait</span>
                        {snapshot.overall_wait_min_minutes != null && snapshot.overall_wait_max_minutes != null && (
                            <span className="ml-auto text-xs font-mono text-white/40 self-center">
                                {snapshot.overall_wait_min_minutes}–{snapshot.overall_wait_max_minutes} min range
                            </span>
                        )}
                    </div>
                )}

                {/* Source tier tag */}
                <div className="mx-6 sm:mx-8 mt-3 shrink-0">
                    <span className="inline-block px-3 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-white/55">
                        Primary Source: {tierLabel}
                    </span>
                </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 space-y-6 min-h-0">
                    {/* Source records */}
                    {snapshot.source_records.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 px-1">
                                Source Records
                            </div>
                            {snapshot.source_records.map((rec, idx) => (
                                <SourceRecord key={idx} record={rec} defaultOpen={idx === 0} />
                            ))}
                        </div>
                    )}

                    {/* CTAS scenario breakdown */}
                    {snapshot.scenarios.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 px-1">
                                Scenario Breakdown (by CTAS Level)
                            </div>
                            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                                {snapshot.scenarios.map((s, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] last:border-0"
                                    >
                                        <span className="text-sm text-white/65 truncate mr-3">{s.label}</span>
                                        <span className="text-sm font-mono font-semibold text-white/80 shrink-0">
                                            {s.wait_minutes != null ? `${s.wait_minutes} min` : "immediate"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 sm:px-8 py-4 border-t border-white/[0.07] shrink-0">
                    <p className="text-xs text-white/35 leading-relaxed">
                        Data sourced from official hospital feeds, public aggregators, and CIHI-calibrated provincial benchmarks.
                        Confidence reflects source freshness and reliability.
                    </p>
                </div>
            </div>
        </div>
    );
});
