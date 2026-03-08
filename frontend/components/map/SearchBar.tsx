"use client";

import { useState, useRef, useEffect, memo } from "react";
import { Mic, Square } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "audio.webm");
  const res = await fetch(`${API_URL}/speech-to-text`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Transcription failed");
  }
  const data = await res.json();
  return data.text ?? "";
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading?: boolean;
  placeholder?: string;
  quickPrompts?: string[];
}

export const SearchBar = memo(function SearchBar({
  value,
  onChange,
  onSearch,
  isLoading = false,
  placeholder = "Describe your symptoms...",
  quickPrompts = [
    "I have a severe headache and blurry vision",
    "My child has a high fever",
    "I cut my hand and it won't stop bleeding",
    "I have a sore throat and cough",
    "I need a prescription refill",
  ],
}: SearchBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) {
          setIsRecording(false);
          return;
        }
        setIsTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const text = await transcribeAudio(blob);
          onChange(value ? `${value} ${text}` : text);
          inputRef.current?.focus();
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      // Microphone access denied or unavailable
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      onSearch();
    }
  };

  const handlePromptClick = (prompt: string) => {
    onChange(prompt);
    setShowDropdown(false);
    inputRef.current?.focus();
    setTimeout(() => onSearch(), 100);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <div className="relative w-full">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <svg
              className="w-5 h-5 text-white/60 transition-colors duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-12 pr-3 py-2 bg-transparent text-white text-sm placeholder:text-white/40 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Voice input for symptoms */}
        {!isRecording && !isTranscribing && (
          <button
            type="button"
            onClick={startRecording}
            className="px-3 py-3 bg-white/[0.04] hover:bg-emerald-500/20 border border-white/[0.06] hover:border-emerald-500/30 text-white/60 hover:text-emerald-300 rounded-xl transition-all flex items-center justify-center"
            disabled={isLoading}
            title="Describe symptoms by voice"
          >
            <Mic size={20} />
          </button>
        )}
        {isRecording && (
          <button
            type="button"
            onClick={stopRecording}
            className="px-3 py-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl animate-pulse flex items-center justify-center"
            title="Stop recording"
          >
            <Square size={18} fill="currentColor" />
          </button>
        )}
        {isTranscribing && (
          <div className="px-3 py-3 bg-white/10 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {quickPrompts.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-3.5 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white rounded-xl border border-white/[0.06] transition-all duration-200 flex items-center justify-center"
              disabled={isLoading}
            >
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showDropdown && (
              <div className="absolute bottom-full right-0 mb-2 glass rounded-xl p-3 z-30 min-w-70 animate-slideUp">
                <div className="text-xs text-white/60 mb-2.5 px-1 font-medium tracking-wide uppercase">
                  Quick prompts
                </div>
                <div className="flex flex-col gap-2">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptClick(prompt)}
                      className="px-3.5 py-2 text-sm bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white rounded-lg border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
