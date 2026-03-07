"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Toolbar, type CareFilter } from "@/components/Toolbar";
import { TriageResultsPanel, type TriageResult, type TriageFacility } from "@/components/panels/TriageResultsPanel";
import { FacilityDetailsPanel, type FacilityDetails } from "@/components/panels/FacilityDetailsPanel";
import { SearchBar } from "@/components/SearchBar";
import { SearchResultPopup } from "@/components/SearchResultPopup";
import { MapControls } from "@/components/MapControls";

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [activeFilter, setActiveFilter] = useState<CareFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Triage / search result state
  const [searchResult, setSearchResult] = useState<{
    urgency: "emergency" | "urgent" | "standard" | "self-care";
    careType: string;
    answer: string;
    coordinates?: [number, number] | null;
    should_fly_to: boolean;
    zoom_level?: number | null;
  } | null>(null);

  // Panel state
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<FacilityDetails | null>(null);

  // Search handler — placeholder for future API integration
  const handleSearch = useCallback(async () => {
    if (!map.current || !searchQuery.trim()) return;

    setIsSearching(true);

    try {
      // TODO: Replace with actual triage API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const center = map.current.getCenter();

      const mockResult: TriageResult = {
        urgency: "urgent",
        careType: "Urgent Care",
        summary: `Based on your symptoms, we recommend visiting an urgent care center. This does not appear to require emergency care, but should be evaluated promptly.`,
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

  // Handle facility selection from triage panel
  const handleFacilitySelect = useCallback(
    (facility: TriageFacility) => {
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

      if (map.current) {
        map.current.flyTo({
          center: facility.coordinates,
          zoom: 16,
          pitch: 60,
          duration: 1500,
        });
      }
    },
    [],
  );

  // Initialize map — 3D dark mode by default
  useEffect(() => {
    if (map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/standard",
        projection: { name: "globe" },
        center: [-73.985, 40.748],
        zoom: 15,
        pitch: 60,
        bearing: -15,
      });

      map.current.on("style.load", () => {
        if (!map.current) return;

        map.current.setConfigProperty("basemap", "showPlaceLabels", true);
        map.current.setConfigProperty("basemap", "showRoadLabels", true);
        map.current.setConfigProperty("basemap", "showPointOfInterestLabels", true);
        map.current.setConfigProperty("basemap", "lightPreset", "night");
      });
    }
  }, []);

  return (
    <div className="relative h-screen w-full">
      {/* Filter Toolbar */}
      <Toolbar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Map Controls */}
      <MapControls map={map.current} />

      {/* Triage Results Panel (Left) */}
      {triageResult && (
        <TriageResultsPanel
          result={triageResult}
          onClose={() => setTriageResult(null)}
          onFacilitySelect={handleFacilitySelect}
        />
      )}

      {/* Facility Details Panel (Right) */}
      {selectedFacility && (
        <FacilityDetailsPanel
          facility={selectedFacility}
          onClose={() => setSelectedFacility(null)}
          accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""}
        />
      )}

      {/* Search Result Popup */}
      {searchResult && (
        <SearchResultPopup
          result={searchResult}
          onClose={() => setSearchResult(null)}
        />
      )}

      {/* Search / Symptom Input Bar */}
      <div
        data-search-container
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-[min(500px,calc(100vw-2rem))] lg:w-125 xl:w-137.5 2xl:w-150 glass rounded-2xl px-4 py-2"
      >
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          isLoading={isSearching}
        />
      </div>

      {/* Map Container */}
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}
