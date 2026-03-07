"use client";

import React, { useRef, useEffect } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { URGENCY_CONFIG } from "@/lib/constants";
import type { TriagePopupResult } from "@/lib/types";

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

  const urgency = URGENCY_CONFIG[result.urgency];

  return (
    <div
      ref={popupRef}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-125 max-h-80 glass rounded-2xl overflow-hidden animate-slideUp"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <span className="text-base">{urgency.icon}</span>
          <span className={`text-xs uppercase tracking-wide font-medium ${urgency.color}`}>
            {urgency.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-all duration-200"
        >
          <Cross2Icon width={14} height={14} className="text-white/50 hover:text-white" />
        </button>
      </div>

      <div className="p-4">
        <div className="text-white font-medium text-base leading-relaxed mb-3">
          {result.answer}
        </div>
        <div className="text-xs text-white/40">
          Recommended:{" "}
          <span className="text-white/70 font-medium">{result.careType}</span>
        </div>
      </div>
    </div>
  );
});
