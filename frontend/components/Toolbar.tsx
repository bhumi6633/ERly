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
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-row items-center h-14 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 px-4 shadow-xl gap-1">
        {FILTERS.map((filter) => (
          <Tooltip.Root key={filter.id}>
            <Tooltip.Trigger asChild>
              <button
                onClick={() =>
                  onFilterChange(activeFilter === filter.id ? "all" : filter.id)
                }
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all ${activeFilter === filter.id
                  ? "bg-emerald-500/25 text-emerald-300 shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/10"
                  }`}
              >
                {filter.icon}
                <span className="text-[10px] font-medium tracking-wide">
                  {filter.label}
                </span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content
              className="select-none rounded-lg bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 text-xs font-medium text-white shadow-xl z-50"
              side="bottom"
              sideOffset={5}
            >
              {filter.tooltip}
              <Tooltip.Arrow className="fill-white/10" />
            </Tooltip.Content>
          </Tooltip.Root>
        ))}
      </div>
    </Tooltip.Provider>
  );
});
