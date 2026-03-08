"use client";

import { memo, useState } from "react";
import { X, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, HelpCircle, ExternalLink } from "lucide-react";
import type { WaitTimeSnapshot } from "@/lib/types";

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
    label: string; color: string; dimColor: string;
    bg: string; border: string; dot: string; accentColor: string;
}> = {
    high:   { label: "High",   color: "text-emerald-400", dimColor: "text-emerald-400/55", bg: "bg-emerald-500/10", border: "border-emerald-500/25", dot: "bg-emerald-400", accentColor: "#10b981" },
    medium: { label: "Medium", color: "text-amber-400",   dimColor: "text-amber-400/55",   bg: "bg-amber-500/10",   border: "border-amber-500/25",   dot: "bg-amber-400",   accentColor: "#f59e0b" },
    low:    { label: "Low",    color: "text-red-400",     dimColor: "text-red-400/55",     bg: "bg-red-500/10",     border: "border-red-500/25",     dot: "bg-red-400",     accentColor: "#ef4444" },
};

function getWaitSeverity(minutes: number) {
    if (minutes < 30) return { text: "text-emerald-400", shadowColor: "rgba(16,185,129,0.55)", glowColor: "rgba(16,185,129,0.12)" };
    if (minutes < 60) return { text: "text-yellow-400",  shadowColor: "rgba(234,179,8,0.55)",  glowColor: "rgba(234,179,8,0.12)" };
    if (minutes < 90) return { text: "text-orange-400",  shadowColor: "rgba(249,115,22,0.55)", glowColor: "rgba(249,115,22,0.12)" };
    return              { text: "text-red-400",           shadowColor: "rgba(239,68,68,0.55)",  glowColor: "rgba(239,68,68,0.12)" };
}

function getScenarioStyle(label: string) {
    const l = label.toLowerCase();
    if (l.includes("immediate") || l.includes("ctas 1") || l.includes("resuscitation"))
        return { bar: "bg-red-500",     text: "text-red-400",     borderColor: "#ef4444" };
    if (l.includes("ctas 2") || l.includes("emergent"))
        return { bar: "bg-orange-500",  text: "text-orange-400",  borderColor: "#f97316" };
    if (l.includes("ambulance"))
        return { bar: "bg-sky-500",     text: "text-sky-400",     borderColor: "#0ea5e9" };
    if (l.includes("ctas 3") || (l.includes("urgent") && !l.includes("less")))
        return { bar: "bg-yellow-500",  text: "text-yellow-400",  borderColor: "#eab308" };
    if (l.includes("ctas 4") || l.includes("less urgent"))
        return { bar: "bg-lime-500",    text: "text-lime-400",    borderColor: "#84cc16" };
    if (l.includes("ctas 5") || l.includes("non-urgent"))
        return { bar: "bg-emerald-500", text: "text-emerald-400", borderColor: "#10b981" };
    return { bar: "bg-white/20", text: "text-white/65", borderColor: "#ffffff30" };
}

interface EvidenceModalProps {
    facilityName: string;
    snapshot: WaitTimeSnapshot;
    onClose: () => void;
}

function SourceRecord({ record, defaultOpen }: { record: WaitTimeSnapshot["source_records"][0]; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen ?? false);
    const meta = record.metadata_json
        ? (() => { try { return JSON.parse(record.metadata_json); } catch { return {}; } })()
        : {};

    const tierLabel = EVIDENCE_TIER_LABELS[record.source_kind] ?? record.source_kind;
    const conf = record.confidence_score;
    const confColor = conf >= 0.7 ? "text-emerald-400" : conf >= 0.45 ? "text-amber-400" : "text-red-400";
    const confBg    = conf >= 0.7 ? "bg-emerald-500/10 border-emerald-500/20" : conf >= 0.45 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";

    return (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors group"
            >
                <span className="text-sm font-semibold text-white/65 group-hover:text-white/90 transition-colors">{tierLabel}</span>
                <span className="flex items-center gap-2.5 shrink-0">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${confColor} ${confBg}`}>
                        {conf.toFixed(2)}
                    </span>
                    {open ? <ChevronUp size={13} className="text-white/30" /> : <ChevronDown size={13} className="text-white/30" />}
                </span>
            </button>

            {open && (
                <div className="border-t border-white/[0.07]">
                    {meta.source_url && (
                        <div className="px-4 py-3 border-b border-white/[0.05]">
                            <div className="text-[9px] uppercase tracking-[0.25em] font-black text-white/25 mb-1.5">Source</div>
                            <a href={meta.source_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-start gap-1.5 text-[11px] text-cyan-400/80 hover:text-cyan-300 break-all font-mono group/link">
                                <ExternalLink size={10} className="shrink-0 mt-0.5 group-hover/link:scale-110 transition-transform" />
                                {meta.source_url}
                            </a>
                        </div>
                    )}
                    {meta.raw_dashboard_text && (
                        <div className="px-4 py-3 border-b border-white/[0.05]">
                            <div className="text-[9px] uppercase tracking-[0.25em] font-black text-white/25 mb-2">Raw Dashboard</div>
                            <pre className="text-[11px] text-white/50 bg-black/40 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed border border-white/[0.04]">
                                {meta.raw_dashboard_text}
                            </pre>
                        </div>
                    )}
                    {meta.formula_explanation && (
                        <div className="px-4 py-3 border-b border-white/[0.05]">
                            <div className="text-[9px] uppercase tracking-[0.25em] font-black text-white/25 mb-2">Formula</div>
                            <div className="bg-black/50 rounded-xl px-4 py-3 overflow-x-auto border border-white/[0.04]">
                                <pre className="text-[11px] font-mono leading-relaxed text-emerald-300/75 whitespace-pre"
                                    style={{ textShadow: "0 0 12px rgba(110,231,183,0.25)" }}>
                                    {meta.formula_explanation}
                                </pre>
                            </div>
                        </div>
                    )}
                    {meta.formula_inputs && typeof meta.formula_inputs === "object" && (
                        <div className="px-4 py-3 border-b border-white/[0.05]">
                            <div className="text-[9px] uppercase tracking-[0.25em] font-black text-white/25 mb-3">Formula Inputs</div>
                            <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-black/30">
                                {Object.entries(meta.formula_inputs as Record<string, { value: number; source_citation: string }>).map(([k, v], i, arr) => (
                                    <div key={k} className={`px-4 py-3 ${i < arr.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-[11px] font-mono font-bold text-emerald-300/85"
                                                style={{ textShadow: "0 0 8px rgba(110,231,183,0.2)" }}>{k}</span>
                                            <span className="text-white/25 font-mono text-[11px]">=</span>
                                            <span className="text-white/70 font-mono text-[11px] font-semibold">{v?.value}</span>
                                        </div>
                                        {v?.source_citation && (
                                            <p className="text-[10px] text-white/28 leading-relaxed pl-2 border-l border-white/[0.08]">
                                                {v.source_citation}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {meta.raw_payload && (
                        <div className="px-4 py-3 border-b border-white/[0.05]">
                            <div className="text-[9px] uppercase tracking-[0.25em] font-black text-white/25 mb-2">API Payload</div>
                            <pre className="text-[11px] text-white/45 bg-black/40 rounded-xl p-3 overflow-x-auto font-mono leading-relaxed max-h-52 border border-white/[0.04]">
                                {JSON.stringify({
                                    averageTimeToSeeDoctor:     meta.raw_payload.averageTimeToSeeDoctor,
                                    averageTimeToSeeDoctor80th: meta.raw_payload.averageTimeToSeeDoctor80th,
                                    patientsWaitingToSeeDoctor: meta.raw_payload.patientsWaitingToSeeDoctor,
                                    activePatients:             meta.raw_payload.activePatients,
                                    activeNoBedAdmits:          meta.raw_payload.activeNoBedAdmits,
                                    lastUpdated:                meta.raw_payload.lastUpdated,
                                }, null, 2)}
                            </pre>
                        </div>
                    )}
                    <div className="px-4 py-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-white/22">reported: {record.reported_at}</span>
                        {meta.source_fingerprint_sha256 && (
                            <span className="text-[9px] font-mono text-white/15 truncate max-w-[180px]">
                                sha256:{meta.source_fingerprint_sha256.slice(0, 12)}…
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export const EvidenceModal = memo(function EvidenceModal({ facilityName, snapshot, onClose }: EvidenceModalProps) {
    const primary = snapshot.source_records[0] ?? null;
    const primaryMeta = primary?.metadata_json
        ? (() => { try { return JSON.parse(primary.metadata_json); } catch { return {}; } })()
        : {};

    const tier = primaryMeta.evidence_tier as string | undefined;
    const tierLabel = tier ? (EVIDENCE_TIER_LABELS[tier] ?? tier) : "Unknown";
    const confidenceCfg = CONFIDENCE_CONFIG[snapshot.confidence_label] ?? CONFIDENCE_CONFIG.low;

    const hasRange = snapshot.overall_wait_min_minutes != null && snapshot.overall_wait_max_minutes != null;
    const rangeMin = snapshot.overall_wait_min_minutes ?? 0;
    const rangeMax = snapshot.overall_wait_max_minutes ?? 0;
    const rangeVal = snapshot.overall_wait_minutes ?? rangeMin;
    const rangePct = hasRange && rangeMax > rangeMin
        ? Math.max(2, Math.min(97, ((rangeVal - rangeMin) / (rangeMax - rangeMin)) * 100))
        : 50;

    const waitSeverity = getWaitSeverity(snapshot.overall_wait_minutes ?? 0);
    const maxScenarioWait = Math.max(...(snapshot.scenarios?.map((s) => s.wait_minutes ?? 0) ?? [1]));

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            <div
                className="relative glass rounded-t-[32px] sm:rounded-[32px] w-full sm:max-w-2xl flex flex-col animate-slideUp overflow-hidden"
                style={{ maxHeight: "88vh" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Confidence-colored top accent strip */}
                <div className="h-[3px] w-full shrink-0" style={{ background: confidenceCfg.accentColor }} />

                {/* Header */}
                <div className="flex items-start justify-between px-6 sm:px-8 pt-5 pb-5 border-b border-white/[0.08] shrink-0">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="text-[9px] uppercase tracking-[0.32em] font-black text-white/28 mb-1.5">
                            Wait Time Evidence
                        </div>
                        <h2 className="text-xl sm:text-[22px] font-bold text-white leading-snug mb-3">
                            {facilityName}
                        </h2>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${confidenceCfg.bg} ${confidenceCfg.border}`}>
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${confidenceCfg.dot}`} />
                            <span className={`text-xs font-bold ${confidenceCfg.color}`}>{confidenceCfg.label} Confidence</span>
                            <span className={`text-xs font-mono ${confidenceCfg.dimColor}`}>{snapshot.confidence_score.toFixed(2)}</span>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="shrink-0 w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.14] flex items-center justify-center transition-all duration-200 group cursor-pointer"
                        aria-label="Close">
                        <X size={16} className="text-white/60 group-hover:text-white transition-colors group-hover:rotate-90 duration-200" />
                    </button>
                </div>

                {/* Wait time hero */}
                {snapshot.overall_wait_minutes != null && (
                    <div className="mx-5 sm:mx-7 mt-5 rounded-2xl overflow-hidden border border-white/[0.07] shrink-0"
                        style={{ background: `radial-gradient(ellipse 80% 100% at 15% 0%, ${waitSeverity.glowColor}, transparent 60%), rgba(255,255,255,0.03)` }}>

                        {/* Number + source tag row */}
                        <div className="px-5 pt-5 pb-4 flex items-end justify-between gap-4 flex-wrap">
                            <div className="flex items-baseline gap-2.5">
                                <span
                                    className={`text-[68px] font-black tabular-nums leading-none ${waitSeverity.text}`}
                                    style={{ textShadow: `0 0 30px ${waitSeverity.shadowColor}, 0 0 60px ${waitSeverity.glowColor}` }}
                                >
                                    {snapshot.overall_wait_minutes}
                                </span>
                                <div className="pb-1">
                                    <div className="text-base font-bold text-white/50">min</div>
                                    <div className="text-[11px] text-white/28 font-medium">predicted wait</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.07] mb-1">
                                <div className="w-1 h-1 rounded-full bg-white/25 animate-pulse" />
                                <span className="text-[9px] font-black text-white/35 uppercase tracking-[0.2em]">{tierLabel}</span>
                            </div>
                        </div>

                        {/* Gradient range bar */}
                        {hasRange && (
                            <div className="px-5 pb-5 border-t border-white/[0.05] pt-4">
                                <div className="relative h-2 rounded-full overflow-visible mb-3">
                                    {/* Gradient track */}
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/35 via-yellow-500/35 to-red-500/35" />
                                    {/* Filled portion */}
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400/60 via-yellow-400/60 to-red-400/60"
                                        style={{ width: `${rangePct}%` }}
                                    />
                                    {/* Glowing indicator dot */}
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-white/60"
                                        style={{
                                            left: `calc(${rangePct}% - 8px)`,
                                            boxShadow: "0 0 0 3px rgba(255,255,255,0.15), 0 0 14px rgba(255,255,255,0.5)",
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-emerald-400/50">{rangeMin} min</span>
                                    <span className="text-white/20">estimated range</span>
                                    <span className="text-red-400/50">{rangeMax} min</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5 min-h-0">

                    {/* CTAS scenario breakdown — shown first, most relevant */}
                    {snapshot.scenarios.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-[9px] uppercase tracking-[0.28em] font-black text-white/28 px-1">
                                Scenario Breakdown · CTAS Level
                            </div>
                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
                                {snapshot.scenarios.map((s, idx) => {
                                    const style = getScenarioStyle(s.label ?? "");
                                    const pct = s.wait_minutes != null && maxScenarioWait > 0
                                        ? Math.max(4, (s.wait_minutes / maxScenarioWait) * 100)
                                        : 0;
                                    const isLast = idx === snapshot.scenarios.length - 1;
                                    return (
                                        <div
                                            key={idx}
                                            className={`px-4 py-3 ${!isLast ? "border-b border-white/[0.05]" : ""}`}
                                            style={{ borderLeft: `3px solid ${style.borderColor}55` }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-white/60 truncate mr-3">{s.label}</span>
                                                <span className={`text-sm font-mono font-bold shrink-0 ${style.text}`}>
                                                    {s.wait_minutes != null ? `${s.wait_minutes} min` : "immediate"}
                                                </span>
                                            </div>
                                            <div className="h-[5px] bg-white/[0.05] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${style.bar} opacity-70`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Source records */}
                    {snapshot.source_records.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-[9px] uppercase tracking-[0.28em] font-black text-white/28 px-1">
                                Source Records
                            </div>
                            {snapshot.source_records.map((rec, idx) => (
                                <SourceRecord key={idx} record={rec} defaultOpen={idx === 0} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 sm:px-8 py-4 border-t border-white/[0.07] shrink-0">
                    <p className="text-[10px] text-white/28 leading-relaxed">
                        Data sourced from official hospital feeds, public aggregators, and CIHI-calibrated provincial benchmarks.
                        Confidence reflects source freshness and reliability.
                    </p>
                </div>
            </div>
        </div>
    );
});
