"use client";

import { memo } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Cross2Icon,
  ActivityLogIcon,
  HomeIcon,
  VideoIcon,
  MixIcon,
} from "@radix-ui/react-icons";
import { Pill, Stethoscope } from "lucide-react";

export type CareFilter =
  | "all"
  | "er"
  | "urgent"
  | "walkin"
  | "telehealth"
  | "pharmacy"
  | "specialty";

interface ToolbarProps {
  activeFilter: CareFilter;
  onFilterChange: (filter: CareFilter) => void;
}

const FILTERS: { id: CareFilter; label: string; icon: React.ReactNode; tooltip: string }[] = [
  {
    id: "all",
    label: "All",
    icon: <MixIcon width={18} height={18} />,
    tooltip: "Show all facilities",
  },
  {
    id: "er",
    label: "ER",
    icon: <Cross2Icon width={18} height={18} />,
    tooltip: "Emergency rooms",
  },
  {
    id: "urgent",
    label: "Urgent",
    icon: <ActivityLogIcon width={18} height={18} />,
    tooltip: "Urgent care centers",
  },
  {
    id: "walkin",
    label: "Walk-in",
    icon: <HomeIcon width={18} height={18} />,
    tooltip: "Walk-in clinics",
  },
  {
    id: "telehealth",
    label: "Tele",
    icon: <VideoIcon width={18} height={18} />,
    tooltip: "Telehealth services",
  },
  {
    id: "pharmacy",
    label: "Rx",
    icon: <Pill size={18} />,
    tooltip: "Pharmacies",
  },
  {
    id: "specialty",
    label: "Specialty",
    icon: <Stethoscope size={18} />,
    tooltip: "Specialty services (dialysis, etc.)",
  },
];

export const Toolbar = memo(function Toolbar({
  activeFilter,
  onFilterChange,
}: ToolbarProps) {
  return (
    <Tooltip.Provider delayDuration={0}>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-row items-center h-14 glass rounded-2xl px-2 gap-0.5 animate-slideUp">
        {FILTERS.map((filter) => (
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
              <Tooltip.Arrow className="fill-white/[0.08]" />
            </Tooltip.Content>
          </Tooltip.Root>
        ))}
      </div>
    </Tooltip.Provider>
  );
});
