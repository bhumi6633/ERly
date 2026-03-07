"use client";

import { useState, memo } from "react";
import Image from "next/image";
import { Cross2Icon, DrawingPinIcon } from "@radix-ui/react-icons";
import { Phone, Clock, Navigation } from "lucide-react";

export interface FacilityDetails {
    id: string;
    name: string;
    type: string;
    address: string;
    coordinates: [number, number];
    phone?: string;
    waitTime?: string;
    distance?: string;
    hours?: string;
    rating?: number;
}

interface FacilityDetailsPanelProps {
    facility: FacilityDetails;
    onClose: () => void;
    accessToken: string;
}

export const FacilityDetailsPanel = memo(function FacilityDetailsPanel({
    facility,
    onClose,
    accessToken,
}: FacilityDetailsPanelProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const [lng, lat] = facility.coordinates;
    const staticImageUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${lng},${lat},16,0,45/400x267@2x?access_token=${accessToken}`;

    return (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-[18vw] min-w-72 max-w-[320px] flex flex-col rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 shadow-xl overflow-hidden animate-[fadeIn_0.2s_ease-out_forwards]">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 p-1 rounded-full bg-black/40 hover:bg-black/60 text-white/60 hover:text-white transition-all"
            >
                <Cross2Icon width={16} height={16} />
            </button>

            {/* Satellite Image */}
            <div className="relative w-full aspect-3/2 bg-gray-800 shrink-0">
                {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white/30 text-sm">Loading...</div>
                    </div>
                )}
                {imageError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                        <div className="text-white/30 text-sm">Image unavailable</div>
                    </div>
                ) : (
                    <Image
                        src={staticImageUrl}
                        alt={`${facility.name} aerial view`}
                        fill
                        className={`object-cover transition-opacity ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                    />
                )}

                {/* Type Badge */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 text-xs font-medium backdrop-blur-sm">
                    {facility.type}
                </div>
            </div>

            {/* Details */}
            <div className="p-4">
                <h3 className="text-white font-semibold text-lg leading-tight">
                    {facility.name}
                </h3>

                <div className="flex items-start gap-2 text-white/60 text-sm mt-2">
                    <DrawingPinIcon width={14} height={14} className="mt-0.5 shrink-0" />
                    <span>{facility.address}</span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                    {facility.waitTime && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                            <Clock size={14} className="text-emerald-400 shrink-0" />
                            <div>
                                <div className="text-[10px] text-white/40 uppercase tracking-wide">Wait</div>
                                <div className="text-white text-sm font-medium">{facility.waitTime}</div>
                            </div>
                        </div>
                    )}
                    {facility.distance && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                            <Navigation size={14} className="text-blue-400 shrink-0" />
                            <div>
                                <div className="text-[10px] text-white/40 uppercase tracking-wide">Distance</div>
                                <div className="text-white text-sm font-medium">{facility.distance}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-4 space-y-2">
                    {facility.phone && (
                        <a
                            href={`tel:${facility.phone}`}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 transition-all text-sm font-medium"
                        >
                            <Phone size={16} />
                            <span>Call {facility.phone}</span>
                        </a>
                    )}
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-sm">
                        <Navigation size={16} />
                        <span>Get Directions</span>
                    </button>
                </div>
            </div>
        </div>
    );
});
