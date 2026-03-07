"use client";

import { Cross2Icon } from "@radix-ui/react-icons";

interface MobileWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileWarningModal({
  isOpen,
  onClose,
}: MobileWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-8 animate-fadeIn">
      <div className="max-w-md text-center glass rounded-2xl p-8 animate-slideUp">
        <h1 className="text-white text-2xl font-bold mb-4">Desktop Required</h1>
        <p className="text-white/60 mb-6 leading-relaxed">
          ERly uses an interactive map that requires a larger screen for the
          best experience. Please switch to a desktop or laptop computer.
        </p>
        <p className="text-white/35 text-sm mb-6">
          Minimum recommended: 1024px width
        </p>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
        >
          <Cross2Icon width={14} height={14} />
          Close
        </button>
      </div>
    </div>
  );
}
