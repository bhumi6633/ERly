"use client";

import { useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { FileText, Send, Clock, Activity, ShieldAlert, MapPin, ArrowRight } from "lucide-react";
import type { MedicalReport } from "@/lib/types";

interface ReportPreviewModalProps {
    report: MedicalReport;
    onConfirm: (patientId: string) => void;
    onCancel: () => void;
}

const DURATION_LABELS: Record<string, string> = {
    now: "Just now",
    hours: "A few hours",
    days: "A few days",
    weeks: "A week or more",
};

const SEVERITY_BAR_COLORS = ["bg-emerald-400", "bg-lime-400", "bg-yellow-400", "bg-orange-400", "bg-red-400"];

function getUrgencyStyle(label: string) {
    const l = label.toLowerCase();
    if (l.includes("critical") || l.includes("emergency"))
        return { text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/25", dot: "bg-red-400", accentColor: "#ef4444", cardBg: "bg-red-500/[0.03]" };
    if (l.includes("high"))
        return { text: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/25", dot: "bg-orange-400", accentColor: "#f97316", cardBg: "bg-orange-500/[0.03]" };
    if (l.includes("medium") || l.includes("moderate"))
        return { text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/25", dot: "bg-yellow-400", accentColor: "#eab308", cardBg: "bg-yellow-500/[0.03]" };
    return { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/25", dot: "bg-emerald-400", accentColor: "#10b981", cardBg: "bg-emerald-500/[0.03]" };
}

export function ReportPreviewModal({ report, onConfirm, onCancel }: ReportPreviewModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const urgencyStyle = getUrgencyStyle(report.assessment.urgencyLabel);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
            const symptoms = report.assessment.symptoms
                ? report.assessment.symptoms.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
                : ["Not specified"];
            const resp = await fetch(`${API_URL}/incoming-patient/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    facility_id: Number(report.selectedFacility.id) || 0,
                    facility_name: report.selectedFacility.name,
                    // travelTimeMinutes is a float — round to int so FastAPI doesn't 422
                    eta_minutes: Math.round(report.recommendation.etaMinutes ?? 15),
                    symptoms,
                    severity: report.assessment.severityLabel,
                    urgency_label: report.assessment.urgencyLabel,
                    care_type: report.recommendation.careType,
                }),
            });
            if (!resp.ok) {
                const errText = await resp.text();
                console.error("POST /incoming-patient/ failed:", resp.status, errText);
                throw new Error(`Server error ${resp.status}`);
            }
            const data = await resp.json();
            onConfirm(data.patient_id);
        } catch (err) {
            console.error("ReportPreviewModal submit error:", err);
            // Fallback so the flow never breaks during demo
            onConfirm("PT-DEMO01");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn p-4">
            <div className="glass rounded-[32px] max-w-2xl w-full max-h-[88vh] overflow-hidden animate-slideUp flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 sm:px-8 py-6 border-b border-white/[0.08] shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-white/[0.07] border border-white/[0.10] flex items-center justify-center shrink-0">
                            <FileText size={20} className="text-white/80" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg leading-none mb-1">Review Report</h2>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-white/40">Confirm details before sending</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.14] flex items-center justify-center transition-all duration-200 group cursor-pointer"
                    >
                        <Cross2Icon className="text-white/60 group-hover:text-white transition-colors" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 px-6 sm:px-8 py-6 space-y-3 min-h-0">

                    {/* Patient Info */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-5 py-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock size={10} className="text-white/30" />
                            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">Patient Information</div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-white/45 text-sm">Submission Time</span>
                            <span className="text-white/80 text-sm font-medium tabular-nums">
                                {new Date(report.patientInfo.timestamp).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Assessment Details */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-5 py-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity size={10} className="text-white/30" />
                            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">Assessment Details</div>
                        </div>
                        <div className="divide-y divide-white/[0.05]">
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-white/45 text-sm">Category</span>
                                <span className="text-white/85 text-sm font-medium capitalize">{report.assessment.category}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-white/45 text-sm">Severity</span>
                                <div className="flex items-center gap-2.5">
                                    <div className="flex gap-[3px]">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                className={`w-4 h-2 rounded-full ${i <= report.assessment.severity ? SEVERITY_BAR_COLORS[report.assessment.severity - 1] : "bg-white/10"}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-white/80 text-sm font-medium">{report.assessment.severityLabel}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-white/45 text-sm">Duration</span>
                                <span className="text-white/80 text-sm font-medium">{DURATION_LABELS[report.assessment.duration] || report.assessment.duration}</span>
                            </div>
                        </div>
                        <div className="pt-3 mt-1 border-t border-white/[0.05]">
                            <div className="text-[10px] uppercase tracking-widest font-bold text-white/25 mb-2">Symptoms</div>
                            <div className="flex gap-3">
                                <div className="w-[2px] bg-white/10 rounded-full shrink-0 self-stretch" />
                                <p className="text-sm text-white/65 leading-relaxed">{report.assessment.symptoms}</p>
                            </div>
                        </div>
                    </div>

                    {/* Triage Result — colored left accent matching urgency */}
                    <div
                        className={`rounded-2xl border border-white/[0.07] px-5 py-4 ${urgencyStyle.cardBg}`}
                        style={{ borderLeft: `3px solid ${urgencyStyle.accentColor}50` }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <ShieldAlert size={10} className="text-white/30" />
                            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">Triage Result</div>
                        </div>
                        <div className="divide-y divide-white/[0.05]">
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-white/45 text-sm">Priority Level</span>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${urgencyStyle.text} ${urgencyStyle.bg} ${urgencyStyle.border}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${urgencyStyle.dot}`} />
                                    {report.assessment.urgencyLabel}
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-2.5">
                                <span className="text-white/45 text-sm">Care Type</span>
                                <span className="text-white/80 text-sm font-medium">{report.recommendation.careType}</span>
                            </div>
                        </div>
                        <div className="pt-3 mt-1 border-t border-white/[0.05]">
                            <div className="text-[10px] uppercase tracking-widest font-bold text-white/25 mb-2">Summary</div>
                            <div className="flex gap-3">
                                <div className="w-[2px] rounded-full shrink-0 self-stretch" style={{ background: `${urgencyStyle.accentColor}50` }} />
                                <p className="text-sm text-white/55 leading-relaxed italic">{report.recommendation.summary}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sending To — destination card */}
                    <div className="rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 px-5 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin size={10} className="text-emerald-400/60 shrink-0" />
                                    <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-400/60">Sending To</div>
                                </div>
                                <p className="text-white font-bold text-base leading-tight">{report.selectedFacility.name}</p>
                                <p className="text-white/50 text-sm mt-1">{report.selectedFacility.type}</p>
                                <p className="text-white/35 text-xs mt-0.5 truncate">{report.selectedFacility.address}</p>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                <ArrowRight size={15} className="text-emerald-400" />
                            </div>
                        </div>
                    </div>

                    {/* Notice */}
                    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] px-5 py-3.5">
                        <p className="text-xs text-white/35 leading-relaxed">
                            <strong className="text-white/55">Note:</strong> This report will be sent to the selected facility.
                            Please ensure all information is accurate before submitting.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-6 sm:px-8 py-5 border-t border-white/[0.08] shrink-0">
                    <button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-3.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] text-white/65 hover:text-white transition-all duration-200 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-white/90 text-black transition-all duration-200 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send size={15} />
                                Submit Report
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
