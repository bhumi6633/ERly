"use client";

import { useState, useRef } from "react";
import {
    Activity, Flame, HeartPulse, Brain, HelpCircle,
    ChevronRight, SkipForward, Mic, Square, Check,
} from "lucide-react";
import type { QuestionnaireData } from "@/lib/types";
import { getApiUrl } from "@/lib/api";

async function transcribeAudio(blob: Blob): Promise<string> {
    const form = new FormData();
    form.append("file", blob, "audio.webm");
    const res = await fetch(`${getApiUrl()}/speech-to-text`, {
        method: "POST",
        body: form,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const msg = typeof err.detail === "string" ? err.detail : (err.message ?? (err.detail?.message ?? JSON.stringify(err.detail ?? err)));
        throw new Error(msg || "Transcription failed");
    }
    const data = await res.json();
    return typeof data.text === "string" ? data.text : (data.text != null ? String(data.text) : "");
}

interface QuestionnaireModalProps {
    onComplete: (data: QuestionnaireData) => void;
    onSkip: () => void;
}

const TOTAL_STEPS = 6;

const CATEGORIES = [
    { id: "pain",    label: "Pain or Discomfort",  icon: Flame,      color: "text-orange-400", border: "border-orange-500/25", bg: "bg-orange-500/[0.08]" },
    { id: "injury",  label: "Injury or Trauma",    icon: Activity,   color: "text-red-400",    border: "border-red-500/25",    bg: "bg-red-500/[0.08]" },
    { id: "illness", label: "Illness or Infection", icon: HeartPulse, color: "text-blue-400",   border: "border-blue-500/25",   bg: "bg-blue-500/[0.08]" },
    { id: "mental",  label: "Mental Health",        icon: Brain,      color: "text-purple-400", border: "border-purple-500/25", bg: "bg-purple-500/[0.08]" },
    { id: "other",   label: "Other Concern",        icon: HelpCircle, color: "text-white/50",   border: "border-white/[0.08]",  bg: "bg-white/[0.04]" },
];

const BODY_AREAS = [
    "Head / Neck",
    "Chest / Heart",
    "Lungs / Breathing",
    "Abdomen / Stomach",
    "Back / Spine",
    "Arms / Hands",
    "Legs / Feet",
    "Whole Body",
    "Not sure",
];

const ASSOCIATED_SYMPTOMS = [
    "Fever (38+ C)",
    "Chills / Sweating",
    "Nausea / Vomiting",
    "Dizziness / Fainting",
    "Shortness of breath",
    "Chest tightness",
    "Rapid heartbeat",
    "Severe headache",
    "Numbness / Tingling",
    "Weakness / Fatigue",
    "Confusion / Disorientation",
    "Bleeding / Open wound",
];

const DURATIONS = [
    { id: "now",   label: "Just started" },
    { id: "hours", label: "A few hours" },
    { id: "days",  label: "A few days" },
    { id: "weeks", label: "A week or more" },
];

const STEP_TITLES = [
    "Chief complaint",
    "Affected area",
    "Associated symptoms",
    "Pain level",
    "Duration",
    "Additional detail",
];

export function QuestionnaireModal({ onComplete, onSkip }: QuestionnaireModalProps) {
    const [step, setStep] = useState(0);
    const [data, setData] = useState<QuestionnaireData>({
        category: null,
        bodyArea: null,
        associatedSymptoms: [],
        severity: null,
        duration: null,
    });
    const [showOtherInput, setShowOtherInput] = useState(false);
    const [otherText, setOtherText] = useState("");
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
    const [symptoms, setSymptoms] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [sttError, setSttError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const finalize = (extra?: Partial<QuestionnaireData>) => {
        const symParts: string[] = [];
        if (data.bodyArea) symParts.push(`Area: ${data.bodyArea}`);
        if (selectedSymptoms.length > 0) symParts.push(`Also experiencing: ${selectedSymptoms.join(", ")}`);
        if (symptoms.trim()) symParts.push(symptoms.trim());
        const finalData: QuestionnaireData = {
            ...data,
            ...extra,
            associatedSymptoms: selectedSymptoms,
            symptoms: symParts.join(". "),
        };
        onComplete(finalData);
    };

    const startRecording = async () => {
        setSttError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
            recorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                if (!chunksRef.current.length) { setIsRecording(false); return; }
                setIsTranscribing(true);
                try {
                    const text = await transcribeAudio(new Blob(chunksRef.current, { type: "audio/webm" }));
                    setSymptoms((prev) => (prev ? `${prev} ${text}` : text).trim());
                } catch (err) {
                    setSttError(err instanceof Error ? err.message : "Transcription failed");
                } finally { setIsTranscribing(false); }
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch (err) {
            setSttError(err instanceof Error ? err.message : "Microphone access denied");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
            setIsRecording(false);
        }
    };

    const toggleSymptom = (s: string) => {
        setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-lg mx-4 rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0c0c0c] shadow-2xl animate-slideUp">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/35 mb-1">
                            ERly Triage
                        </div>
                        <h2 className="text-white font-bold text-lg leading-tight">
                            {STEP_TITLES[step]}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-white/25 text-xs font-mono">{step + 1} / {TOTAL_STEPS}</span>
                        <button
                            onClick={onSkip}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] transition-all text-xs font-medium"
                        >
                            <SkipForward size={12} />
                            Skip all
                        </button>
                    </div>
                </div>

                {/* Step Content */}
                <div className="px-6 py-5 min-h-[260px]">

                    {/* Step 0: Category */}
                    {step === 0 && (
                        <div className="animate-fadeIn">
                            <p className="text-white/50 text-xs mb-4">What best describes your concern?</p>
                            <div className="grid grid-cols-2 gap-2">
                                {CATEGORIES.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setData(prev => ({ ...prev, category: cat.id }));
                                                if (cat.id === "other") { setShowOtherInput(true); }
                                                else { setShowOtherInput(false); setStep(1); }
                                            }}
                                            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200 hover:brightness-125 ${cat.bg} ${cat.border} ${cat.id === "other" ? "col-span-2" : ""}`}
                                        >
                                            <Icon size={18} className={cat.color} />
                                            <span className="text-white/90 text-sm font-medium">{cat.label}</span>
                                            <ChevronRight size={13} className="ml-auto text-white/20" />
                                        </button>
                                    );
                                })}
                            </div>
                            {showOtherInput && (
                                <div className="mt-4 animate-fadeIn">
                                    <input
                                        type="text"
                                        value={otherText}
                                        onChange={(e) => setOtherText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && otherText.trim()) {
                                                setData(prev => ({ ...prev, otherCategory: otherText.trim() }));
                                                setShowOtherInput(false);
                                                setStep(1);
                                            }
                                        }}
                                        placeholder="Describe your concern briefly..."
                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors mt-2"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2 mt-3">
                                        <button onClick={() => { setShowOtherInput(false); setOtherText(""); }} className="px-3 py-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">Cancel</button>
                                        <button
                                            disabled={!otherText.trim()}
                                            onClick={() => { setData(prev => ({ ...prev, otherCategory: otherText.trim() })); setShowOtherInput(false); setStep(1); }}
                                            className="px-4 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white text-xs font-medium transition-all disabled:opacity-30"
                                        >Continue</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 1: Body area */}
                    {step === 1 && (
                        <div className="animate-fadeIn">
                            <p className="text-white/50 text-xs mb-4">Where is it affecting you?</p>
                            <div className="grid grid-cols-3 gap-2">
                                {BODY_AREAS.map((area) => {
                                    const selected = data.bodyArea === area;
                                    return (
                                        <button
                                            key={area}
                                            onClick={() => { setData(prev => ({ ...prev, bodyArea: area })); setStep(2); }}
                                            className={`px-3 py-3 rounded-xl border text-xs font-medium text-center transition-all duration-150 ${
                                                selected
                                                    ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                                                    : "bg-white/[0.03] border-white/[0.07] text-white/65 hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-white"
                                            }`}
                                        >
                                            {area}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <button onClick={() => setStep(0)} className="text-white/30 hover:text-white/60 text-xs transition-colors">Back</button>
                                <button onClick={() => setStep(2)} className="text-white/30 hover:text-white/60 text-xs transition-colors">Skip this step</button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Associated symptoms */}
                    {step === 2 && (
                        <div className="animate-fadeIn">
                            <p className="text-white/50 text-xs mb-4">Select all that apply (optional)</p>
                            <div className="flex flex-wrap gap-2">
                                {ASSOCIATED_SYMPTOMS.map((sym) => {
                                    const on = selectedSymptoms.includes(sym);
                                    return (
                                        <button
                                            key={sym}
                                            onClick={() => toggleSymptom(sym)}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12px] font-medium transition-all duration-150 ${
                                                on
                                                    ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300"
                                                    : "bg-white/[0.03] border-white/[0.07] text-white/55 hover:bg-white/[0.07] hover:text-white/80"
                                            }`}
                                        >
                                            {on && <Check size={11} className="shrink-0" />}
                                            {sym}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center justify-between mt-5">
                                <button onClick={() => setStep(1)} className="text-white/30 hover:text-white/60 text-xs transition-colors">Back</button>
                                <button
                                    onClick={() => setStep(3)}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white/80 hover:text-white text-xs font-medium transition-all"
                                >
                                    {selectedSymptoms.length > 0 ? `${selectedSymptoms.length} selected, continue` : "None of these, continue"}
                                    <ChevronRight size={13} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Pain level (0-10 VAS) */}
                    {step === 3 && (
                        <div className="animate-fadeIn">
                            <p className="text-white/50 text-xs mb-1">How would you rate your pain or discomfort?</p>
                            <p className="text-white/25 text-[11px] mb-5">0 = no pain at all · 10 = worst imaginable</p>
                            <div className="flex gap-1">
                                {Array.from({ length: 11 }, (_, i) => {
                                    const cls = i <= 1
                                        ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.16]"
                                        : i <= 3
                                        ? "border-lime-500/30 text-lime-300 bg-lime-500/[0.08] hover:bg-lime-500/[0.16]"
                                        : i <= 5
                                        ? "border-amber-500/30 text-amber-300 bg-amber-500/[0.08] hover:bg-amber-500/[0.16]"
                                        : i <= 7
                                        ? "border-orange-500/30 text-orange-300 bg-orange-500/[0.08] hover:bg-orange-500/[0.16]"
                                        : "border-red-500/30 text-red-300 bg-red-500/[0.08] hover:bg-red-500/[0.16]";
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => { setData(prev => ({ ...prev, severity: i })); setStep(4); }}
                                            className={`flex-1 py-3.5 rounded-xl border text-sm font-black transition-all duration-150 ${cls}`}
                                        >
                                            {i}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between mt-2 text-[9px] text-white/25 px-0.5">
                                <span>No pain</span><span>Moderate</span><span>Unbearable</span>
                            </div>
                            <button onClick={() => setStep(2)} className="mt-4 text-white/30 hover:text-white/60 text-xs transition-colors">Back</button>
                        </div>
                    )}

                    {/* Step 4: Duration */}
                    {step === 4 && (
                        <div className="animate-fadeIn">
                            <p className="text-white/50 text-xs mb-4">How long have you had these symptoms?</p>
                            <div className="flex flex-col gap-2">
                                {DURATIONS.map((dur) => (
                                    <button
                                        key={dur.id}
                                        onClick={() => { setData(prev => ({ ...prev, duration: dur.id })); setStep(5); }}
                                        className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.12] transition-all text-sm text-white/75 hover:text-white"
                                    >
                                        {dur.label}
                                        <ChevronRight size={14} className="text-white/20" />
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setStep(3)} className="mt-4 text-white/30 hover:text-white/60 text-xs transition-colors">Back</button>
                        </div>
                    )}

                    {/* Step 5: Free text + voice */}
                    {step === 5 && (
                        <div className="animate-fadeIn">
                            <p className="text-white/50 text-xs mb-3">Anything else you want us to know? <span className="text-white/30">(optional)</span></p>
                            <div className="flex gap-2">
                                <textarea
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                    placeholder="Describe your symptoms in your own words, or tap the mic..."
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors resize-none h-28"
                                    autoFocus
                                />
                                <div className="flex flex-col gap-1 items-center justify-start pt-1">
                                    {!isRecording && !isTranscribing && (
                                        <button
                                            type="button"
                                            onClick={startRecording}
                                            className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.10] text-white/50 hover:text-white/80 hover:bg-white/[0.10] transition-all"
                                            title="Record by voice"
                                        >
                                            <Mic size={18} />
                                        </button>
                                    )}
                                    {isRecording && (
                                        <button
                                            type="button"
                                            onClick={stopRecording}
                                            className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse transition-all"
                                        >
                                            <Square size={16} fill="currentColor" />
                                        </button>
                                    )}
                                    {isTranscribing && (
                                        <div className="p-2.5 rounded-xl bg-white/[0.05] flex items-center justify-center">
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                                        </div>
                                    )}
                                    <span className="text-[9px] text-white/25 mt-0.5">Voice</span>
                                </div>
                            </div>
                            {sttError && <p className="text-red-400/80 text-xs mt-2">{sttError}</p>}
                            <div className="flex items-center justify-between mt-5">
                                <button onClick={() => setStep(4)} className="text-white/30 hover:text-white/60 text-xs transition-colors">Back</button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => finalize()}
                                        className="px-4 py-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] text-xs transition-all"
                                    >
                                        Skip
                                    </button>
                                    <button
                                        onClick={() => finalize({ symptoms: symptoms.trim() })}
                                        className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white text-sm font-semibold transition-all"
                                    >
                                        Find Care
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Progress bar */}
                <div className="px-6 pb-5">
                    <div className="flex gap-1">
                        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                            <div
                                key={i}
                                className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
                                    i <= step ? "bg-white/50" : "bg-white/[0.08]"
                                }`}
                            />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
