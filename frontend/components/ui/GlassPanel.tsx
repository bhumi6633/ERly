"use client";

import { cn } from "@/lib/utils";

type AnimationVariant = "fadeIn" | "slideUp" | "slideInLeft" | "slideInRight" | "none";

const ANIMATION_CLASSES: Record<AnimationVariant, string> = {
    fadeIn: "animate-fadeIn",
    slideUp: "animate-slideUp",
    slideInLeft: "animate-slideInLeft",
    slideInRight: "animate-slideInRight",
    none: "",
};

interface GlassPanelProps {
    children: React.ReactNode;
    className?: string;
    animation?: AnimationVariant;
    as?: "div" | "section" | "aside";
}

/**
 * Reusable glassmorphic container component.
 * Applies the ERly `.glass` design token with optional entrance animations.
 */
export function GlassPanel({
    children,
    className,
    animation = "fadeIn",
    as: Component = "div",
}: GlassPanelProps) {
    return (
        <Component
            className={cn(
                "glass rounded-2xl overflow-hidden",
                ANIMATION_CLASSES[animation],
                className,
            )}
        >
            {children}
        </Component>
    );
}
