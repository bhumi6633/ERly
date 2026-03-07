"use client";

import { memo } from "react";
import { SunIcon, MoonIcon } from "@radix-ui/react-icons";

interface MapSettingsPanelProps {
    lightMode: "day" | "night";
    onToggleLightMode: () => void;
}

export const MapSettingsPanel = memo(function MapSettingsPanel({
    lightMode,
    onToggleLightMode,
}: MapSettingsPanelProps) {
    return (
        <div className="absolute left-4 top-24 z-10 flex flex-col items-center rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 p-3 shadow-xl">
            <button
                onClick={onToggleLightMode}
                className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all w-10 bg-white/20 text-white shadow-lg"
            >
                {lightMode === "day" ? (
                    <SunIcon width={20} height={20} />
                ) : (
                    <MoonIcon width={20} height={20} />
                )}
                <span className="text-xs font-medium">
                    {lightMode === "day" ? "Day" : "Night"}
                </span>
            </button>
        </div>
    );
});
