"use client";

import { useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { FileText, Send } from "lucide-react";
import type { MedicalReport } from "@/lib/types";

interface ReportPreviewModalProps {
    report: MedicalReport;
    onConfirm: () => void;
    onCancel: () => void;
}

const SEVERITY_LABELS = ["", "Mild", "Minor", "Moderate", "Severe", "Critical"];
const DURATION_LABELS: Record<string, string> = {
    now: "Just now",
    hours: "A few hours",
    days: "A few days",
    weeks: "A week or more",
};

export function ReportPreviewModal({ report, onConfirm, onCancel }: ReportPreviewModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        onConfirm();
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
                <div className="overflow-y-auto flex-1 px-6 sm:px-8 py-6 space-y-4 min-h-0">
                    {/* Patient Info */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-5">
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 mb-3">Patient Information</div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-3">
                                <span className="text-white/50">Submission Time</span>
                                <span className="text-white/80 font-medium">
                                    {new Date(report.patientInfo.timestamp).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Assessment Details */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-5">
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 mb-4">Assessment Details</div>
                        <div className="space-y-3">
                            <div className="flex justify-between gap-3">
                                <span className="text-white/50 text-sm">Category</span>
                                <span className="text-white/85 text-sm font-medium capitalize">{report.assessment.category}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-white/50 text-sm">Severity</span>
                                <span className="text-white/85 text-sm font-medium">{report.assessment.severity}/5 &mdash; {report.assessment.severityLabel}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-white/50 text-sm">Duration</span>
                                <span className="text-white/85 text-sm font-medium">{DURATION_LABELS[report.assessment.duration] || report.assessment.duration}</span>
                            </div>
                            <div className="pt-2 border-t border-white/[0.06]">
                                <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1.5">Symptoms</div>
                                <p className="text-sm text-white/75 leading-relaxed">{report.assessment.symptoms}</p>
                            </div>
                        </div>
                    </div>

                    {/* Urgency Level */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-5">
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 mb-4">Triage Result</div>
                        <div className="space-y-3">
                            <div className="flex justify-between gap-3">
                                <span className="text-white/50 text-sm">Priority Level</span>
                                <span className="text-white/90 text-sm font-bold">{report.assessment.urgencyLabel}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-white/50 text-sm">Care Type</span>
                                <span className="text-white/85 text-sm font-medium">{report.recommendation.careType}</span>
                            </div>
                            <div className="pt-2 border-t border-white/[0.06]">
                                <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1.5">Summary</div>
                                <p className="text-sm text-white/65 leading-relaxed">{report.recommendation.summary}</p>
                            </div>
                        </div>
                    </div>

                    {/* Selected Facility */}
                    <div className="rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 p-5">
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-400/70 mb-3">Sending To</div>
                        <p className="text-white font-bold text-base leading-tight">{report.selectedFacility.name}</p>
                        <p className="text-white/55 text-sm mt-1">{report.selectedFacility.type}</p>
                        <p className="text-white/40 text-xs mt-1">{report.selectedFacility.address}</p>
                    </div>

                    {/* Notice */}
                    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4">
                        <p className="text-xs text-white/40 leading-relaxed">
                            <strong className="text-white/60">Note:</strong> This report will be sent to the selected facility.
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
