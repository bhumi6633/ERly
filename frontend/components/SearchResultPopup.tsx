"use client";

import React, { useRef, useEffect } from "react";

interface TriagePopupResult {
  urgency: "emergency" | "urgent" | "standard" | "self-care";
  careType: string;
  answer: string;
  coordinates?: [number, number] | null;
  should_fly_to: boolean;
  zoom_level?: number | null;
}

function getUrgencyDisplay(urgency: string): {
  icon: string;
  label: string;
  color: string;
} {
  switch (urgency) {
    case "emergency":
      return { icon: "🔴", label: "Emergency", color: "text-red-400" };
    case "urgent":
      return { icon: "🟡", label: "Urgent Care", color: "text-amber-400" };
    case "standard":
      return { icon: "🟢", label: "Non-Urgent", color: "text-emerald-400" };
    case "self-care":
      return { icon: "💊", label: "Self-Care", color: "text-blue-400" };
    default:
      return { icon: "ℹ️", label: "Assessment", color: "text-white/60" };
  }
}

interface SearchResultPopupProps {
  result: TriagePopupResult;
  onClose: () => void;
}

export const SearchResultPopup = React.memo(function SearchResultPopup({
  result,
  onClose,
}: SearchResultPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        const searchBar = document.querySelector("[data-search-container]");
        if (searchBar && searchBar.contains(event.target as Node)) return;
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const urgency = getUrgencyDisplay(result.urgency);

  return (
    <div
      ref={popupRef}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-125 max-h-80 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-xl overflow-hidden opacity-100 animate-[fadeIn_0.2s_ease-out_forwards]"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">{urgency.icon}</span>
          <span
            className={`text-xs uppercase tracking-wide font-medium ${urgency.color}`}
          >
            {urgency.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors duration-200"
        >
          <svg
            className="w-4 h-4 text-white/60 hover:text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="p-4">
        <div className="text-white font-medium text-base leading-relaxed mb-3">
          {result.answer}
        </div>
        <div className="text-xs text-white/50">
          Recommended:{" "}
          <span className="text-white/80 font-medium">{result.careType}</span>
        </div>
      </div>
    </div>
  );
});
