"use client";

import { useState } from "react";
import { Activity, Flame, HeartPulse, Brain, HelpCircle, ChevronRight, SkipForward } from "lucide-react";
import type { QuestionnaireData } from "@/lib/types";

interface QuestionnaireModalProps {
    onComplete: (data: QuestionnaireData) => void;
    onSkip: () => void;
}

const CATEGORIES = [
    { id: "pain", label: "Pain", icon: Flame, color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/20" },
    { id: "injury", label: "Injury", icon: Activity, color: "text-red-400", bg: "bg-red-500/15 border-red-500/20" },
    { id: "illness", label: "Illness", icon: HeartPulse, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/20" },
    { id: "mental", label: "Mental Health", icon: Brain, color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/20" },
    { id: "other", label: "Other", icon: HelpCircle, color: "text-white/60", bg: "bg-white/[0.06] border-white/[0.08]" },
];

const DURATIONS = [
    { id: "now", label: "Just now" },
    { id: "hours", label: "A few hours" },
    { id: "days", label: "A few days" },
    { id: "weeks", label: "A week or more" },
];

export function QuestionnaireModal({ onComplete, onSkip }: QuestionnaireModalProps) {
    const [step, setStep] = useState(0);
    const [data, setData] = useState<QuestionnaireData>({
        category: null,
        severity: null,
        duration: null,
    });

    const handleCategorySelect = (category: string) => {
        setData((prev) => ({ ...prev, category }));
        setStep(1);
    };

    const handleSeveritySelect = (severity: number) => {
        setData((prev) => ({ ...prev, severity }));
        setStep(2);
    };

    const handleDurationSelect = (duration: string) => {
        const finalData = { ...data, duration };
        setData(finalData);
        onComplete(finalData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="glass rounded-2xl max-w-lg w-full mx-4 overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
                    <div>
                        <h2 className="text-white font-semibold text-lg">Quick Assessment</h2>
                        <p className="text-white/40 text-xs mt-0.5">
                            Step {step + 1} of 3 — helps us find the right care
                        </p>
                    </div>
                    <button
                        onClick={onSkip}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200 text-xs font-medium"
                    >
                        <SkipForward size={14} />
                        Skip
                    </button>
                </div>

                {/* Step Content */}
                <div className="p-6">
                    {step === 0 && (
                        <div className="animate-fadeIn">
                            <p className="text-white/60 text-sm mb-4">What brings you in today?</p>
                            <div className="grid grid-cols-2 gap-2">
                                {CATEGORIES.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleCategorySelect(cat.id)}
                                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${cat.bg} ${cat.id === "other" ? "col-span-2" : ""
                                                }`}
                                        >
                                            <Icon size={20} className={cat.color} />
                                            <span className="text-white text-sm font-medium">{cat.label}</span>
                                            <ChevronRight size={14} className="ml-auto text-white/20" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="animate-fadeIn">
                            <p className="text-white/60 text-sm mb-4">How severe is it?</p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((level) => {
                                    const colors = [
                                        "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
                                        "bg-lime-500/20 border-lime-500/30 text-lime-300",
                                        "bg-amber-500/20 border-amber-500/30 text-amber-300",
                                        "bg-orange-500/20 border-orange-500/30 text-orange-300",
                                        "bg-red-500/20 border-red-500/30 text-red-300",
                                    ];
                                    const labels = ["Mild", "Minor", "Moderate", "Severe", "Critical"];
                                    return (
                                        <button
                                            key={level}
                                            onClick={() => handleSeveritySelect(level)}
                                            className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl border transition-all duration-200 hover:scale-105 ${colors[level - 1]}`}
                                        >
                                            <span className="text-2xl font-bold">{level}</span>
                                            <span className="text-[10px] font-medium tracking-wide">{labels[level - 1]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setStep(0)}
                                className="mt-4 text-white/30 hover:text-white/60 text-xs transition-colors"
                            >
                                ← Back
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-fadeIn">
                            <p className="text-white/60 text-sm mb-4">How long have you been experiencing this?</p>
                            <div className="flex flex-col gap-2">
                                {DURATIONS.map((dur) => (
                                    <button
                                        key={dur.id}
                                        onClick={() => handleDurationSelect(dur.id)}
                                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 text-sm text-white/80 hover:text-white"
                                    >
                                        {dur.label}
                                        <ChevronRight size={14} className="text-white/20" />
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setStep(1)}
                                className="mt-4 text-white/30 hover:text-white/60 text-xs transition-colors"
                            >
                                ← Back
                            </button>
                        </div>
                    )}
                </div>

                {/* Progress bar */}
                <div className="px-6 pb-4">
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                            style={{ width: `${((step + 1) / 3) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
