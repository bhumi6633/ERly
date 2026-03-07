"use client";

import { useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { FileText, User, Activity, Clock, AlertCircle, MapPin, Send, Check } from "lucide-react";
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="glass rounded-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/15">
                            <FileText size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-lg">Review Report</h2>
                            <p className="text-white/40 text-xs">Confirm details before sending</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all duration-200"
                    >
                        <Cross2Icon width={16} height={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(85vh-160px)] p-6 space-y-4">
                    {/* Patient Info */}
                    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <User size={16} className="text-emerald-400" />
                            <h3 className="text-white font-medium text-sm">Patient Information</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/50">Submission Time:</span>
                                <span className="text-white">
                                    {new Date(report.patientInfo.timestamp).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Assessment Details */}
                    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity size={16} className="text-blue-400" />
                            <h3 className="text-white font-medium text-sm">Assessment Details</h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <span className="text-white/50 text-xs uppercase tracking-wider">Category</span>
                                <p className="text-white mt-1 capitalize">{report.assessment.category}</p>
                            </div>
                            <div>
                                <span className="text-white/50 text-xs uppercase tracking-wider">Severity Level</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-white font-semibold">{report.assessment.severity}/5</span>
                                    <span className="text-white/60">({report.assessment.severityLabel})</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-white/50 text-xs uppercase tracking-wider">Duration</span>
                                <p className="text-white mt-1">{DURATION_LABELS[report.assessment.duration] || report.assessment.duration}</p>
                            </div>
                            <div>
                                <span className="text-white/50 text-xs uppercase tracking-wider">Symptoms</span>
                                <p className="text-white mt-1 leading-relaxed">{report.assessment.symptoms}</p>
                            </div>
                        </div>
                    </div>

                    {/* Urgency Level */}
                    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertCircle size={16} className="text-amber-400" />
                            <h3 className="text-white font-medium text-sm">Triage Result</h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <span className="text-white/50 text-xs uppercase tracking-wider">Priority Level</span>
                                <p className="text-white mt-1 font-semibold">{report.assessment.urgencyLabel}</p>
                            </div>
                            <div>
                                <span className="text-white/50 text-xs uppercase tracking-wider">Recommended Care</span>
                                <p className="text-white mt-1">{report.recommendation.careType}</p>
                            </div>
                            <div>
                                <span className="text-white/50 text-xs uppercase tracking-wider">Summary</span>
                                <p className="text-white/70 mt-1 text-sm leading-relaxed">
                                    {report.recommendation.summary}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Selected Facility */}
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <MapPin size={16} className="text-emerald-400" />
                            <h3 className="text-white font-medium text-sm">Sending To</h3>
                        </div>
                        <div className="space-y-2">
                            <p className="text-white font-semibold">{report.selectedFacility.name}</p>
                            <p className="text-white/60 text-sm">{report.selectedFacility.type}</p>
                            <p className="text-white/50 text-sm">{report.selectedFacility.address}</p>
                        </div>
                    </div>

                    {/* Notice */}
                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                        <p className="text-blue-300 text-xs leading-relaxed">
                            <strong>Note:</strong> This report will be sent to the selected facility. 
                            Please ensure all information is accurate before submitting.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-6 py-4 border-t border-white/[0.08]">
                    <button
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-all duration-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white transition-all duration-200 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send size={16} />
                                Submit Report
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
