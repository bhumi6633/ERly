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
import { ReportPreviewModal } from "@/components/modals/ReportPreviewModal";
import { ReportSuccessModal } from "@/components/modals/ReportSuccessModal";

import { MAP_CONFIG, URGENCY_CONFIG } from "@/lib/constants";
import type {
  CareFilter,
  TriageResult,
  TriageFacility,
  FacilityDetails,
  TriagePopupResult,
  QuestionnaireData,
  MedicalReport,
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
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const currentLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);

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
  const [userSeverity, setUserSeverity] = useState<number | null>(null);
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [lastSymptoms, setLastSymptoms] = useState<string>("");
  
  // ── Report state ──
  const [reportPreview, setReportPreview] = useState<MedicalReport | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ── Flow handlers ──
  const handleAuthComplete = useCallback(() => {
    setFlowStep("questionnaire");
  }, []);

  const handleQuestionnaireComplete = useCallback((data: QuestionnaireData) => {
    setFlowStep("map");
    setShowToolbar(true);
    setUserSeverity(data.severity);
    setQuestionnaireData(data); // Save questionnaire data for report

    // Set initial filter based on severity
    if (data.severity && data.severity >= 4) {
      setActiveFilter("er");
    } else if (data.severity && data.severity === 3) {
      setActiveFilter("walkin");
    } else if (data.severity && data.severity <= 2) {
      setActiveFilter("pharmacy");
    }
  }, []);

  const handleQuestionnaireSkip = useCallback(() => {
    setFlowStep("map");
    setShowToolbar(true);
  }, []);

  // ── Generate facilities based on severity ──
  const generateFacilitiesBySeverity = useCallback((center: { lng: number; lat: number }, severity: number | null) => {
    // Severity 1-2: Pharmacies (Low Priority)
    if (severity && severity <= 2) {
      return {
        urgency: "low" as const,
        careType: "Pharmacy",
        summary: "Based on your symptoms, we recommend visiting a pharmacy. Your condition appears mild and can likely be managed with over-the-counter medication.",
        facilities: [
          {
            id: "1",
            name: "CVS Pharmacy",
            type: "Pharmacy",
            distance: "0.2 mi",
            waitTime: "~5 min",
            address: "123 Main St",
            coordinates: [center.lng + 0.003, center.lat + 0.002] as [number, number],
          },
          {
            id: "2",
            name: "Walgreens",
            type: "Pharmacy",
            distance: "0.4 mi",
            waitTime: "~10 min",
            address: "456 Oak Ave",
            coordinates: [center.lng - 0.002, center.lat + 0.004] as [number, number],
          },
          {
            id: "3",
            name: "Rite Aid Pharmacy",
            type: "Pharmacy",
            distance: "0.6 mi",
            waitTime: "~8 min",
            address: "789 Elm Blvd",
            coordinates: [center.lng + 0.005, center.lat - 0.001] as [number, number],
          },
        ],
      };
    }
    
    // Severity 3: Walk-in Clinics + Dialysis (Medium Priority)
    if (severity === 3) {
      return {
        urgency: "medium" as const,
        careType: "Walk-in Clinic",
        summary: "Based on your symptoms, we recommend visiting a walk-in clinic. Your condition requires medical attention but is not an emergency.",
        facilities: [
          {
            id: "1",
            name: "QuickCare Walk-in Clinic",
            type: "Walk-in Clinic",
            distance: "0.5 mi",
            waitTime: "~20 min",
            address: "123 Main St",
            coordinates: [center.lng + 0.004, center.lat + 0.003] as [number, number],
          },
          {
            id: "2",
            name: "CityMD Walk-in Clinic",
            type: "Walk-in Clinic",
            distance: "0.8 mi",
            waitTime: "~30 min",
            address: "456 Oak Ave",
            coordinates: [center.lng - 0.003, center.lat + 0.005] as [number, number],
          },
          {
            id: "3",
            name: "Dialysis Center NYC",
            type: "Dialysis Center",
            distance: "1.0 mi",
            waitTime: "~15 min",
            address: "789 Elm Blvd",
            coordinates: [center.lng + 0.006, center.lat - 0.002] as [number, number],
          },
        ],
      };
    }
    
    // Severity 4-5: Emergency Rooms (High Priority)
    if (severity && severity >= 4) {
      return {
        urgency: "high" as const,
        careType: "Emergency Room",
        summary: "Based on your symptoms, we strongly recommend visiting an emergency room immediately. Your condition requires urgent medical attention.",
        facilities: [
          {
            id: "1",
            name: "Mount Sinai Hospital ER",
            type: "Emergency Room",
            distance: "0.6 mi",
            waitTime: "~45 min",
            address: "123 Main St",
            coordinates: [center.lng + 0.005, center.lat + 0.004] as [number, number],
          },
          {
            id: "2",
            name: "Lenox Hill Hospital ER",
            type: "Emergency Room",
            distance: "1.2 mi",
            waitTime: "~60 min",
            address: "456 Oak Ave",
            coordinates: [center.lng - 0.004, center.lat + 0.006] as [number, number],
          },
          {
            id: "3",
            name: "NewYork-Presbyterian ER",
            type: "Emergency Room",
            distance: "1.5 mi",
            waitTime: "~50 min",
            address: "789 Elm Blvd",
            coordinates: [center.lng + 0.007, center.lat - 0.003] as [number, number],
          },
        ],
      };
    }
    
    // Default fallback
    return {
      urgency: "medium" as const,
      careType: "Walk-in Clinic",
      summary: "Based on your symptoms, we recommend visiting a walk-in clinic for evaluation.",
      facilities: [],
    };
  }, []);

  // ── Search handler ──
  const handleSearch = useCallback(async () => {
    if (!mapRef.current || !searchQuery.trim()) return;

    setIsSearching(true);
    setShowToolbar(true); // Show toolbar after first search

    try {
      // Save symptoms for report
      setLastSymptoms(searchQuery.trim());
      
      // TODO: Replace with actual triage API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const center = mapRef.current.getCenter();
      const mockResult = generateFacilitiesBySeverity(center, userSeverity);

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
  }, [searchQuery, userSeverity, generateFacilitiesBySeverity]);

  // ── Clear existing markers ──
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  }, []);

  // ── Add current location marker (blue pin) ──
  const addCurrentLocationMarker = useCallback(() => {
    if (!mapRef.current) return;

    // Remove existing current location marker if any
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.remove();
    }

    const center = mapRef.current.getCenter();

    // Create blue pin element - BIGGER AND BOLDER
    const el = document.createElement('div');
    el.className = 'current-location-marker';
    el.style.width = '50px';
    el.style.height = '50px';
    el.style.cursor = 'default';
    el.style.zIndex = '1000';
    
    // Bigger, bolder blue pin with pulsing animation
    el.innerHTML = `
      <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <!-- Outer pulse ring -->
        <circle cx="25" cy="25" r="20" fill="#3B82F6" opacity="0.2">
          <animate attributeName="r" from="15" to="22" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <!-- Outer circle -->
        <circle cx="25" cy="25" r="14" fill="#3B82F6" opacity="0.4" filter="url(#glow)"/>
        <!-- Middle circle -->
        <circle cx="25" cy="25" r="10" fill="#3B82F6" stroke="#1E40AF" stroke-width="2"/>
        <!-- Inner white dot -->
        <circle cx="25" cy="25" r="5" fill="#FFFFFF"/>
      </svg>
    `;

    // Create and add marker
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center',
    })
      .setLngLat([center.lng, center.lat])
      .addTo(mapRef.current);

    currentLocationMarkerRef.current = marker;
  }, []);

  // ── Add red markers for suggested facilities ──
  const addFacilityMarkers = useCallback((facilities: TriageFacility[]) => {
    if (!mapRef.current) return;

    clearMarkers();

    facilities.forEach((facility) => {
      // Create a custom red marker element
      const el = document.createElement('div');
      el.className = 'facility-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.cursor = 'pointer';
      
      // Add red pin SVG
      el.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" 
                fill="#EF4444" 
                stroke="#991B1B" 
                stroke-width="0.5"/>
        </svg>
      `;

      // Create marker and add to map
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat(facility.coordinates)
        .addTo(mapRef.current!);

      // Add click handler to select facility
      el.addEventListener('click', () => {
        handleFacilitySelect(facility);
      });

      markersRef.current.push(marker);
    });
  }, [clearMarkers]);

  // ── Clear route from map ──
  const clearRoute = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    // Remove all possible route layers (including old ones)
    const layersToRemove = ['route-bright', 'route-dashes', 'route', 'route-outline'];
    layersToRemove.forEach(layerId => {
      if (map.getLayer(layerId)) {
        try {
          map.removeLayer(layerId);
          console.log(`Removed layer: ${layerId}`);
        } catch (error) {
          console.log(`Could not remove layer ${layerId}:`, error);
        }
      }
    });
    
    // Remove source after all layers are gone
    if (map.getSource('route')) {
      try {
        map.removeSource('route');
        console.log('Removed route source');
      } catch (error) {
        console.log('Could not remove route source:', error);
      }
    }
  }, []);

  // ── Draw route from user location to facility ──
  const drawRoute = useCallback(async (destination: [number, number]) => {
    if (!mapRef.current) {
      console.error('Map not ready');
      return;
    }

    const map = mapRef.current;
    const center = map.getCenter();
    const startLng = center.lng;
    const startLat = center.lat;
    const [endLng, endLat] = destination;

    console.log('Drawing route from:', [startLng, startLat], 'to:', [endLng, endLat]);

    try {
      // Clear existing route first
      clearRoute();

      // Wait to ensure layers are fully cleared
      await new Promise(resolve => setTimeout(resolve, 200));

      // Fetch route from Mapbox Directions API
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
      console.log('Fetching route from Mapbox...');
      
      const response = await fetch(url);
      const data = await response.json();

      console.log('Mapbox response:', data);

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0].geometry;
        console.log('Route geometry:', route);

        // Check if source already exists and remove it
        if (map.getSource('route')) {
          console.log('Route source still exists, removing...');
          clearRoute();
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Add route source
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route,
          },
        });

        // Add route outline (darker border for contrast)
        map.addLayer({
          id: 'route-outline',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#7F1D1D',
            'line-width': 14,
            'line-opacity': 0.8,
          },
        });

        // Add main route line (BOLD DARK RED DOTTED LINE - very visible)
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#B91C1C',
            'line-width': 10,
            'line-opacity': 1.0,
            'line-dasharray': [3, 4], // Larger dots: 3px dash, 4px gap
          },
        });

        console.log('Route layers added successfully');

        // Fit map to show entire route
        const coordinates = route.coordinates;
        const bounds = coordinates.reduce(
          (bounds: mapboxgl.LngLatBounds, coord: [number, number]) => {
            return bounds.extend(coord as [number, number]);
          },
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );

        map.fitBounds(bounds, {
          padding: 150,
          duration: 2000,
        });
      } else {
        console.error('No routes found in response');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  }, [clearRoute]);

  // ── Create medical report ──
  const createReport = useCallback((facility: FacilityDetails): MedicalReport => {
    const severity = questionnaireData?.severity || 3;
    const category = questionnaireData?.otherCategory || questionnaireData?.category || "general";
    const duration = questionnaireData?.duration || "unknown";
    
    // Determine urgency based on severity
    let urgency: "low" | "medium" | "high" = "medium";
    if (severity <= 2) urgency = "low";
    else if (severity >= 4) urgency = "high";
    
    const urgencyConfig = URGENCY_CONFIG[urgency];
    const severityLabels = ["", "Mild", "Minor", "Moderate", "Severe", "Critical"];

    return {
      patientInfo: {
        timestamp: new Date().toISOString(),
      },
      assessment: {
        category: category,
        severity: severity,
        severityLabel: severityLabels[severity] || "Unknown",
        duration: duration,
        symptoms: lastSymptoms || "Not specified",
        urgencyLevel: urgency,
        urgencyLabel: urgencyConfig.label,
      },
      recommendation: {
        careType: triageResult?.careType || "General Care",
        summary: triageResult?.summary || "Please visit the facility for evaluation",
      },
      selectedFacility: {
        id: facility.id,
        name: facility.name,
        type: facility.type,
        address: facility.address,
      },
    };
  }, [questionnaireData, lastSymptoms, triageResult]);

  // ── Facility selection ──
  const handleFacilitySelect = useCallback((facility: TriageFacility) => {
    console.log('🏥 Facility selected:', facility.name);
    
    const facilityDetails: FacilityDetails = {
      id: facility.id,
      name: facility.name,
      type: facility.type,
      address: facility.address,
      coordinates: facility.coordinates,
      waitTime: facility.waitTime,
      distance: facility.distance,
      phone: "(555) 123-4567",
      hours: "Open 24/7",
    };
    
    setSelectedFacility(facilityDetails);

    // Draw route to the selected facility
    console.log('🗺️ Drawing route to facility at:', facility.coordinates);
    drawRoute(facility.coordinates);

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: facility.coordinates,
        zoom: 16,
        pitch: MAP_CONFIG.pitch,
        duration: 1500,
      });
    }
  }, [drawRoute]);

  // ── Add markers when triage results change ──
  useEffect(() => {
    if (triageResult && mapReady) {
      addFacilityMarkers(triageResult.facilities);
    }
    return () => {
      clearMarkers();
    };
  }, [triageResult, mapReady, addFacilityMarkers, clearMarkers]);

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

  // ── Add/remove current location marker based on map state and modals ──
  useEffect(() => {
    const shouldShowPin = mapReady && 
                         flowStep === "map" && 
                         !reportPreview && 
                         !showSuccessModal;
    
    if (shouldShowPin) {
      addCurrentLocationMarker();
    } else {
      // Hide the pin when any modal is open
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.remove();
        currentLocationMarkerRef.current = null;
      }
    }
  }, [mapReady, flowStep, reportPreview, showSuccessModal, addCurrentLocationMarker]);

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
          onClose={() => {
            setSelectedFacility(null);
            clearRoute();
          }}
          accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""}
          onShowRoute={() => {
            // Show report preview instead of immediate route
            const report = createReport(selectedFacility);
            setReportPreview(report);
          }}
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

      {/* ── Report Preview Modal ── */}
      {reportPreview && (
        <ReportPreviewModal
          report={reportPreview}
          onConfirm={() => {
            // TODO: Send report to backend API
            // Example: await fetch('/api/reports', { method: 'POST', body: JSON.stringify(reportPreview) })
            
            setReportPreview(null);
            setShowSuccessModal(true);
          }}
          onCancel={() => {
            setReportPreview(null);
          }}
        />
      )}

      {/* ── Report Success Modal ── */}
      {showSuccessModal && selectedFacility && (
        <ReportSuccessModal
          facilityName={selectedFacility.name}
          onClose={() => {
            setShowSuccessModal(false);
            // Show the route after success
            if (selectedFacility) {
              drawRoute(selectedFacility.coordinates);
            }
          }}
          onGoHome={() => {
            setShowSuccessModal(false);
            setSelectedFacility(null);
            setTriageResult(null);
            clearRoute();
          }}
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
