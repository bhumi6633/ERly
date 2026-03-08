"use client";

import { useState, useEffect, useMemo } from "react";
import { formatMinutes } from "@/lib/utils";
import type { QuestionnaireData, TriageResult } from "@/lib/types";

interface Props {
    phase: "hidden" | "analyzing" | "verdict";
    questionnaireData: QuestionnaireData | null;
    triageResult: TriageResult | null;
}

function buildSteps(d: QuestionnaireData | null): string[] {
    const catMap: Record<string, string> = {
        pain: "Pain / Discomfort",
        injury: "Injury / Trauma",
        illness: "Illness / Infection",
        mental: "Mental Health",
        other: d?.otherCategory ?? "Other concern",
    };

    const steps: string[] = [];

    const cat = d?.category ? (catMap[d.category] ?? d.category) : null;
    const area = d?.bodyArea;
    steps.push(cat
        ? `Chief complaint: ${cat}${area ? ` — ${area}` : ""}`
        : "Receiving clinical intake..."
    );

    if (d?.associatedSymptoms && d.associatedSymptoms.length > 0) {
        const preview = d.associatedSymptoms.slice(0, 3).join(", ") +
            (d.associatedSymptoms.length > 3 ? ` +${d.associatedSymptoms.length - 3} more` : "");
        steps.push(`Associated findings: ${preview}`);
    } else {
        steps.push("No additional findings flagged");
    }

    if (d?.severity != null) {
        const p = d.severity;
        const desc = p <= 2 ? "mild" : p <= 4 ? "moderate" : p <= 6 ? "significant" : p <= 8 ? "severe" : "critical";
        steps.push(`Pain level: ${p}/10 — ${desc}`);
    }

    const durMap: Record<string, string> = {
        now: "acute onset (minutes)",
        hours: "hours in duration",
        days: "days in duration",
        weeks: "chronic (weeks or more)",
    };
    if (d?.duration) {
        steps.push(`Temporal pattern: ${durMap[d.duration] ?? d.duration}`);
    }

    steps.push("Applying Canadian Triage & Acuity Scale (CTAS)...");
    steps.push("Querying live wait times across nearby facilities...");
    steps.push("Optimizing route × wait time combinations...");
    steps.push("Care pathway identified.");

    return steps;
}

const VERDICT: Record<string, { label: string; sub: string; color: string; glow: string }> = {
    emergency: {
        label: "EMERGENCY",
        sub: "Proceed immediately to the nearest Emergency Room",
        color: "text-red-400",
        glow: "0 0 80px rgba(239,68,68,0.35)",
    },
    high: {
        label: "HIGH PRIORITY",
        sub: "Seek emergency care without delay",
        color: "text-red-400",
        glow: "0 0 80px rgba(239,68,68,0.35)",
    },
    urgent: {
        label: "URGENT CARE",
        sub: "Visit an urgent care centre today — no ER wait required",
        color: "text-amber-300",
        glow: "0 0 80px rgba(251,191,36,0.28)",
    },
    medium: {
        label: "URGENT",
        sub: "Seek care within the next few hours",
        color: "text-amber-300",
        glow: "0 0 80px rgba(251,191,36,0.28)",
    },
    standard: {
        label: "NON-URGENT",
        sub: "A walk-in clinic or family doctor can help you today",
        color: "text-emerald-400",
        glow: "0 0 80px rgba(52,211,153,0.22)",
    },
    low: {
        label: "NON-URGENT",
        sub: "A walk-in clinic or pharmacy is the right fit",
        color: "text-emerald-400",
        glow: "0 0 80px rgba(52,211,153,0.22)",
    },
    "self-care": {
        label: "SELF-CARE",
        sub: "Rest and home treatment is appropriate",
        color: "text-sky-400",
        glow: "0 0 80px rgba(56,189,248,0.22)",
    },
};

export function TriageReasoningOverlay({ phase, questionnaireData, triageResult }: Props) {
    const [visibleCount, setVisibleCount] = useState(0);
    const [displayedSaved, setDisplayedSaved] = useState(0);
    const steps = useMemo(() => buildSteps(questionnaireData), [questionnaireData]);

    // Stream steps one-by-one
    useEffect(() => {
        if (phase !== "analyzing") {
            setVisibleCount(0);
            return;
        }
        setVisibleCount(1);
        let count = 1;
        const id = setInterval(() => {
            count++;
            setVisibleCount(count);
            if (count >= steps.length) clearInterval(id);
        }, 490);
        return () => clearInterval(id);
    }, [phase, steps.length]);

    // Time-saved count-up
    const savedMin = triageResult?.timeSavedMinutes ?? 0;
    useEffect(() => {
        if (phase !== "verdict" || !savedMin) { setDisplayedSaved(0); return; }
        let cur = 0;
        const step = Math.max(1, Math.round(savedMin / 30));
        const id = setInterval(() => {
            cur = Math.min(cur + step, savedMin);
            setDisplayedSaved(cur);
            if (cur >= savedMin) clearInterval(id);
        }, 55);
        return () => clearInterval(id);
    }, [phase, savedMin]);

    if (phase === "hidden") return null;

    // ── Verdict screen ────────────────────────────────────────────────────────
    if (phase === "verdict" && triageResult) {
        const v = VERDICT[triageResult.urgency] ?? VERDICT.standard;
        return (
            <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/96 animate-fadeIn">
                <div className="flex flex-col items-center gap-3 text-center px-8 animate-scaleIn">
                    <div className="text-[9px] uppercase tracking-[0.55em] text-white/25 font-bold mb-3">
                        Assessment Complete
                    </div>
                    <div
                        className={`text-[68px] sm:text-[80px] leading-none font-black tracking-tighter ${v.color}`}
                        style={{ textShadow: v.glow }}
                    >
                        {v.label}
                    </div>
                    <div className="text-white/55 text-[15px] font-medium max-w-sm leading-relaxed mt-1">
                        {v.sub}
                    </div>
                    <div className="text-white/35 text-sm font-medium">{triageResult.careType}</div>

                    {displayedSaved > 0 && (
                        <div className="mt-6 px-10 py-5 rounded-2xl bg-emerald-500/[0.09] border border-emerald-500/25 flex flex-col items-center gap-1">
                            <div className="text-[9px] uppercase tracking-[0.4em] text-emerald-400/60 font-bold">
                                vs Waiting at Nearest ER
                            </div>
                            <div className="text-[56px] font-black text-emerald-300 tabular-nums leading-none mt-1">
                                {formatMinutes(displayedSaved)}
                            </div>
                            <div className="text-emerald-400/55 text-sm font-semibold">saved</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Analyzing screen ──────────────────────────────────────────────────────
    const allDone = visibleCount >= steps.length;

    return (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/96">
            {/* Scanning bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-ekgScan" />
            </div>

            <div className="w-full max-w-[360px] mx-6">
                <div className="text-[9px] uppercase tracking-[0.5em] text-white/20 mb-1 font-bold">
                    ERly Clinical AI
                </div>
                <div className="text-white text-[22px] font-bold mb-8 leading-snug">
                    {allDone ? "Recommendation ready" : "Analyzing your presentation..."}
                </div>

                <div className="space-y-[14px]">
                    {steps.map((step, i) => {
                        if (i >= visibleCount) return null;
                        const done = i < visibleCount - 1 || allDone;
                        const active = i === visibleCount - 1 && !allDone;
                        return (
                            <div key={i} className="flex items-start gap-3 animate-fadeIn">
                                <div className={`mt-[3px] shrink-0 w-[15px] h-[15px] rounded-full flex items-center justify-center border transition-all ${
                                    done ? "bg-emerald-500/20 border-emerald-500/40" : "border-white/15"
                                }`}>
                                    {done && (
                                        <svg viewBox="0 0 10 10" className="w-[9px] h-[9px]">
                                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#4ade80" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                    {active && <div className="w-1.5 h-1.5 bg-white/35 rounded-full animate-pulse" />}
                                </div>
                                <span className={`text-sm leading-snug ${done ? "text-white/65" : "text-white/35"}`}>
                                    {step}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {!allDone && (
                    <div className="mt-6 flex items-center gap-2 text-white/18 text-xs">
                        <div className="w-3 h-3 border border-white/12 border-t-white/35 rounded-full animate-spin" />
                        Processing...
                    </div>
                )}
            </div>
        </div>
    );
}
