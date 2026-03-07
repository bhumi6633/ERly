"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { Toolbar } from "@/components/map/Toolbar";
import { SearchBar } from "@/components/map/SearchBar";
import { SearchResultPopup } from "@/components/map/SearchResultPopup";
import { MapControls } from "@/components/map/MapControls";
import { TriageResultsPanel } from "@/components/panels/TriageResultsPanel";
import { FacilityDetailsPanel } from "@/components/panels/FacilityDetailsPanel";
import { AuthModal } from "@/components/modals/AuthModal";
import { QuestionnaireModal } from "@/components/modals/QuestionnaireModal";

import { MAP_CONFIG } from "@/lib/constants";
import type {
  CareFilter,
  TriageResult,
  TriageFacility,
  FacilityDetails,
  TriagePopupResult,
  QuestionnaireData,
} from "@/lib/types";

// ── Flow Steps ──
type FlowStep = "auth" | "questionnaire" | "map";

function MapPageInner() {
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "true";

  // ── Map refs ──
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // ── Flow state ──
  const [flowStep, setFlowStep] = useState<FlowStep>(
    isWelcome ? "auth" : "map"
  );
  const [showToolbar, setShowToolbar] = useState(!isWelcome);

  // ── UI state ──
  const [activeFilter, setActiveFilter] = useState<CareFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<TriagePopupResult | null>(null);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<FacilityDetails | null>(null);

  // ── Flow handlers ──
  const handleAuthComplete = useCallback(() => {
    setFlowStep("questionnaire");
  }, []);

  const handleQuestionnaireComplete = useCallback((data: QuestionnaireData) => {
    setFlowStep("map");
    setShowToolbar(true);

    // Set initial filter based on severity
    if (data.severity && data.severity >= 4) {
      setActiveFilter("er");
    } else if (data.severity && data.severity >= 3) {
      setActiveFilter("urgent");
    }
  }, []);

  const handleQuestionnaireSkip = useCallback(() => {
    setFlowStep("map");
    setShowToolbar(true);
  }, []);

  // ── Search handler ──
  const handleSearch = useCallback(async () => {
    if (!mapRef.current || !searchQuery.trim()) return;

    setIsSearching(true);
    setShowToolbar(true); // Show toolbar after first search

    try {
      // TODO: Replace with actual triage API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const center = mapRef.current.getCenter();

      const mockResult: TriageResult = {
        urgency: "urgent",
        careType: "Urgent Care",
        summary:
          "Based on your symptoms, we recommend visiting an urgent care center. This does not appear to require emergency care, but should be evaluated promptly.",
        facilities: [
          {
            id: "1",
            name: "CityMD Urgent Care",
            type: "Urgent Care",
            distance: "0.3 mi",
            waitTime: "~15 min",
            address: "123 Main St",
            coordinates: [center.lng + 0.005, center.lat + 0.003],
          },
          {
            id: "2",
            name: "MinuteClinic",
            type: "Walk-in Clinic",
            distance: "0.7 mi",
            waitTime: "~25 min",
            address: "456 Oak Ave",
            coordinates: [center.lng - 0.003, center.lat + 0.005],
          },
          {
            id: "3",
            name: "Community Health Center",
            type: "Urgent Care",
            distance: "1.2 mi",
            waitTime: "~10 min",
            address: "789 Elm Blvd",
            coordinates: [center.lng + 0.008, center.lat - 0.002],
          },
        ],
      };

      setTriageResult(mockResult);
      setSearchResult({
        urgency: mockResult.urgency,
        careType: mockResult.careType,
        answer: mockResult.summary,
        coordinates: [center.lng, center.lat],
        should_fly_to: false,
        zoom_level: null,
      });
      setSearchQuery("");
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // ── Facility selection ──
  const handleFacilitySelect = useCallback((facility: TriageFacility) => {
    setSelectedFacility({
      id: facility.id,
      name: facility.name,
      type: facility.type,
      address: facility.address,
      coordinates: facility.coordinates,
      waitTime: facility.waitTime,
      distance: facility.distance,
      phone: "(555) 123-4567",
      hours: "Open 24/7",
    });

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: facility.coordinates,
        zoom: 16,
        pitch: MAP_CONFIG.pitch,
        duration: 1500,
      });
    }
  }, []);

  // ── Map initialization ──
  useEffect(() => {
    if (mapRef.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_CONFIG.style,
      projection: { name: "globe" },
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      pitch: MAP_CONFIG.pitch,
      bearing: MAP_CONFIG.bearing,
    });

    map.on("style.load", () => {
      map.setConfigProperty("basemap", "showPlaceLabels", true);
      map.setConfigProperty("basemap", "showRoadLabels", true);
      map.setConfigProperty("basemap", "showPointOfInterestLabels", true);
      map.setConfigProperty("basemap", "lightPreset", MAP_CONFIG.lightPreset);
    });

    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
    });

    // Fallback — some Mapbox versions fire style.load before load
    map.on("style.load", () => {
      if (!mapRef.current) {
        mapRef.current = map;
        setMapReady(true);
      }
    });
  }, []);

  return (
    <div className="relative h-screen w-full">
      {/* ── Map Container ── */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* ── Filter Toolbar (shown after questionnaire/search) ── */}
      {showToolbar && flowStep === "map" && (
        <Toolbar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      )}

      {/* ── Map Controls ── */}
      {mapReady && <MapControls map={mapRef.current} />}

      {/* ── Triage Results Panel (Left) ── */}
      {triageResult && (
        <TriageResultsPanel
          result={triageResult}
          onClose={() => setTriageResult(null)}
          onFacilitySelect={handleFacilitySelect}
        />
      )}

      {/* ── Facility Details Panel (Right) ── */}
      {selectedFacility && (
        <FacilityDetailsPanel
          facility={selectedFacility}
          onClose={() => setSelectedFacility(null)}
          accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""}
        />
      )}

      {/* ── Search Result Popup ── */}
      {searchResult && (
        <SearchResultPopup
          result={searchResult}
          onClose={() => setSearchResult(null)}
        />
      )}

      {/* ── Search / Symptom Input Bar ── */}
      {flowStep === "map" && (
        <div
          data-search-container
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-[min(500px,calc(100vw-2rem))] lg:w-125 xl:w-137.5 2xl:w-150 glass rounded-2xl px-4 py-2 animate-slideUp"
        >
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            isLoading={isSearching}
          />
        </div>
      )}

      {/* ── Auth Modal ── */}
      {flowStep === "auth" && (
        <AuthModal onContinueAsGuest={handleAuthComplete} />
      )}

      {/* ── Questionnaire Modal ── */}
      {flowStep === "questionnaire" && (
        <QuestionnaireModal
          onComplete={handleQuestionnaireComplete}
          onSkip={handleQuestionnaireSkip}
        />
      )}
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function MapPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-black" />}>
      <MapPageInner />
    </Suspense>
  );
}
