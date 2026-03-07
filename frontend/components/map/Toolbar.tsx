"use client";

import { memo } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { CARE_FILTERS } from "@/lib/constants";
import type { CareFilter } from "@/lib/types";

interface ToolbarProps {
  activeFilter: CareFilter;
  onFilterChange: (filter: CareFilter) => void;
}

export const Toolbar = memo(function Toolbar({
  activeFilter,
  onFilterChange,
}: ToolbarProps) {
  return (
    <Tooltip.Provider delayDuration={0}>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-row items-center h-14 glass rounded-2xl px-2 gap-0.5 animate-slideUp">
        {CARE_FILTERS.map((filter) => (
          <Tooltip.Root key={filter.id}>
            <Tooltip.Trigger asChild>
              <button
                onClick={() =>
                  onFilterChange(activeFilter === filter.id ? "all" : filter.id)
                }
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 ${activeFilter === filter.id
                    ? "bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : "text-white/50 hover:text-white hover:bg-white/8"
                  }`}
              >
                {filter.icon}
                <span className="text-[10px] font-medium tracking-wide">
                  {filter.label}
                </span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content
              className="select-none rounded-lg glass px-3 py-1.5 text-xs font-medium text-white z-50"
              side="bottom"
              sideOffset={8}
            >
              {filter.tooltip}
              <Tooltip.Arrow className="fill-white/[0.12]" />
            </Tooltip.Content>
          </Tooltip.Root>
        ))}
      </div>
    </Tooltip.Provider>
  );
});
