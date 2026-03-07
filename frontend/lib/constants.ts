import type { UrgencyLevel, CareFilter } from "./types";
import { Cross2Icon, ActivityLogIcon, HomeIcon, VideoIcon, MixIcon } from "@radix-ui/react-icons";
import { Pill, Stethoscope } from "lucide-react";
import React from "react";

// ── Map Configuration ──

export const MAP_CONFIG = {
    center: [-73.985, 40.748] as [number, number],
    zoom: 13,
    pitch: 45,
    bearing: -15,
    style: "mapbox://styles/mapbox/standard" as const,
    lightPreset: "night" as const,
} as const;

// ── Urgency Display Configuration ──

export const URGENCY_CONFIG: Record<
    UrgencyLevel,
    { label: string; color: string; bg: string; border: string; icon: string; glow?: boolean }
> = {
    emergency: {
        label: "Emergency",
        color: "text-red-400",
        bg: "bg-red-500/20",
        border: "border-red-500/30",
        icon: "🔴",
        glow: true,
    },
    urgent: {
        label: "Urgent",
        color: "text-amber-400",
        bg: "bg-amber-500/20",
        border: "border-amber-500/30",
        icon: "🟡",
    },
    standard: {
        label: "Non-Urgent",
        color: "text-emerald-400",
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/30",
        icon: "🟢",
    },
    "self-care": {
        label: "Self-Care",
        color: "text-blue-400",
        bg: "bg-blue-500/20",
        border: "border-blue-500/30",
        icon: "💊",
    },
};

// ── Care Filter Definitions ──

export const CARE_FILTERS: { id: CareFilter; label: string; icon: React.ReactNode; tooltip: string }[] = [
    {
        id: "all",
        label: "All",
        icon: React.createElement(MixIcon, { width: 18, height: 18 }),
        tooltip: "Show all facilities",
    },
    {
        id: "er",
        label: "ER",
        icon: React.createElement(Cross2Icon, { width: 18, height: 18 }),
        tooltip: "Emergency rooms",
    },
    {
        id: "urgent",
        label: "Urgent",
        icon: React.createElement(ActivityLogIcon, { width: 18, height: 18 }),
        tooltip: "Urgent care centers",
    },
    {
        id: "walkin",
        label: "Walk-in",
        icon: React.createElement(HomeIcon, { width: 18, height: 18 }),
        tooltip: "Walk-in clinics",
    },
    {
        id: "telehealth",
        label: "Tele",
        icon: React.createElement(VideoIcon, { width: 18, height: 18 }),
        tooltip: "Telehealth services",
    },
    {
        id: "pharmacy",
        label: "Rx",
        icon: React.createElement(Pill, { size: 18 }),
        tooltip: "Pharmacies",
    },
    {
        id: "specialty",
        label: "Specialty",
        icon: React.createElement(Stethoscope, { size: 18 }),
        tooltip: "Specialty services (dialysis, etc.)",
    },
];
