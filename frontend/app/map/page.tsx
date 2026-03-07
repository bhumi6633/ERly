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
  const isERMap = searchParams.get("erMap") === "true";

  // ── Map refs ──
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const currentLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const currentLocationRef = useRef<[number, number] | null>(null); // Store actual current location
  const erMapLoadedRef = useRef(false);

  // ── Flow state ──
  const [flowStep, setFlowStep] = useState<FlowStep>(
    isERMap ? "map" : (isWelcome ? "auth" : "map")
  );
  const [showToolbar, setShowToolbar] = useState(!isWelcome && !isERMap);

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
  const [allowReportSubmission, setAllowReportSubmission] = useState(false);

  // ── Generate facilities based on severity ──
  const generateFacilitiesBySeverity = useCallback((center: { lng: number; lat: number }, severity: number | null) => {
    // Helper function to generate safe land-based coordinates
    // Mix of close, medium, and moderately far - avoiding water
    const generateEvenlySpacedCoords = (count: number, baseDistance: number): [number, number][] => {
      // Land-safe offsets: prioritize west and north directions (away from rivers)
      const streetOffsets: [number, number][] = [
        // Close facilities (2-4 blocks)
        [0, baseDistance * 0.6],              // Close North
        [-baseDistance * 0.5, baseDistance * 0.4],  // Close NW
        [-baseDistance * 0.6, 0],             // Close West
        [-baseDistance * 0.4, -baseDistance * 0.5], // Close SW
        
        // Medium distance (5-8 blocks)
        [0, baseDistance * 1.2],              // Medium North
        [-baseDistance * 1, baseDistance * 0.7],    // Medium NW
        [-baseDistance * 1.1, 0],             // Medium West
        [-baseDistance * 0.7, -baseDistance * 1],   // Medium SW
        
        // Moderately far (9-12 blocks)
        [0, baseDistance * 1.8],              // Far North
        [-baseDistance * 1.5, baseDistance * 1],    // Far NW
      ];
      
      return streetOffsets.slice(0, count).map(([lngOffset, latOffset]) => {
        // Small jitter for natural placement
        const jitter = baseDistance * 0.08;
        const jitterLng = (Math.random() - 0.5) * jitter;
        const jitterLat = (Math.random() - 0.5) * jitter;
        
        return [
          center.lng + lngOffset + jitterLng,
          center.lat + latOffset + jitterLat
        ];
      });
    };

    // Calculate Care Access Time (lower is better)
    const calculateCareAccessTime = (distance: number, waitTime: number): number => {
      // Normalize: distance in miles * 2 (mins per mile) + wait time
      return (distance * 2) + waitTime;
    };

    // Severity 1-2: 10 Pharmacies (Low Priority)
    if (severity && severity <= 2) {
      const pharmacyNames = [
        "CVS Pharmacy", "Walgreens", "Rite Aid Pharmacy", "Duane Reade",
        "Walgreens Pharmacy", "CVS Health", "Rite Aid", "Pharmacy Plus",
        "HealthMart Pharmacy", "Community Pharmacy"
      ];
      const coords = generateEvenlySpacedCoords(10, 0.012);
      
      const facilities = coords.map((coord, idx) => {
        const distance = 0.3 + (idx * 0.2);
        const waitTime = 5 + Math.floor(Math.random() * 10);
        return {
          id: String(idx + 1),
          name: pharmacyNames[idx],
          type: "Pharmacy",
          distance: `${distance.toFixed(1)} mi`,
          waitTime: `~${waitTime} min`,
          address: `${100 + idx * 10} Main St`,
          coordinates: coord,
          careAccessTime: calculateCareAccessTime(distance, waitTime),
        };
      });

      // Sort by Care Access Time
      facilities.sort((a, b) => a.careAccessTime - b.careAccessTime);

      return {
        urgency: "low" as const,
        careType: "Pharmacy",
        summary: "Based on your assessment, we recommend visiting a pharmacy. Your condition appears mild and can likely be managed with over-the-counter medication.",
        facilities,
      };
    }
    
    // Severity 3: 6 Walk-in Clinics + 4 Dialysis Centers (Medium Priority)
    if (severity === 3) {
      const clinicNames = [
        "QuickCare Walk-in Clinic", "CityMD Walk-in Clinic", "MedExpress Urgent Care",
        "FastMed Walk-in Clinic", "CareNow Walk-in Clinic", "Concentra Urgent Care"
      ];
      const dialysisNames = [
        "Dialysis Center NYC", "Fresenius Kidney Care", "DaVita Dialysis Center", "Renal Care Center"
      ];
      
      const coords = generateEvenlySpacedCoords(10, 0.015);
      const facilities = [];

      // Add 6 walk-in clinics
      for (let i = 0; i < 6; i++) {
        const distance = 0.4 + (i * 0.25);
        const waitTime = 15 + Math.floor(Math.random() * 25);
        facilities.push({
          id: String(i + 1),
          name: clinicNames[i],
          type: "Walk-in Clinic",
          distance: `${distance.toFixed(1)} mi`,
          waitTime: `~${waitTime} min`,
          address: `${200 + i * 10} Oak Ave`,
          coordinates: coords[i],
          careAccessTime: calculateCareAccessTime(distance, waitTime),
        });
      }

      // Add 4 dialysis centers
      for (let i = 0; i < 4; i++) {
        const distance = 0.6 + (i * 0.3);
        const waitTime = 10 + Math.floor(Math.random() * 15);
        facilities.push({
          id: String(i + 7),
          name: dialysisNames[i],
          type: "Dialysis Center",
          distance: `${distance.toFixed(1)} mi`,
          waitTime: `~${waitTime} min`,
          address: `${300 + i * 10} Elm Blvd`,
          coordinates: coords[i + 6],
          careAccessTime: calculateCareAccessTime(distance, waitTime),
        });
      }

      facilities.sort((a, b) => a.careAccessTime - b.careAccessTime);

      return {
        urgency: "medium" as const,
        careType: "Walk-in Clinic",
        summary: "Based on your assessment, we recommend visiting a walk-in clinic. Your condition requires medical attention but is not an emergency.",
        facilities,
      };
    }
    
    // Severity 4-5: 10 Emergency Rooms (High Priority)
    if (severity && severity >= 4) {
      const erNames = [
        "Mount Sinai Hospital ER", "Lenox Hill Hospital ER", "NewYork-Presbyterian ER",
        "NYU Langone ER", "Bellevue Hospital ER", "Mount Sinai West ER",
        "Manhattan Eye & Ear ER", "Roosevelt Hospital ER", "St. Luke's Hospital ER",
        "Columbia Presbyterian ER"
      ];
      const coords = generateEvenlySpacedCoords(10, 0.018);
      
      const facilities = coords.map((coord, idx) => {
        const distance = 0.5 + (idx * 0.3);
        const waitTime = 35 + Math.floor(Math.random() * 40);
        return {
          id: String(idx + 1),
          name: erNames[idx],
          type: "Emergency Room",
          distance: `${distance.toFixed(1)} mi`,
          waitTime: `~${waitTime} min`,
          address: `${400 + idx * 10} Medical Plaza`,
          coordinates: coord,
          careAccessTime: calculateCareAccessTime(distance, waitTime),
        };
      });

      facilities.sort((a, b) => a.careAccessTime - b.careAccessTime);

      return {
        urgency: "high" as const,
        careType: "Emergency Room",
        summary: "Based on your assessment, we strongly recommend visiting an emergency room immediately. Your condition requires urgent medical attention.",
        facilities,
      };
    }
    
    // Default fallback
    return {
      urgency: "medium" as const,
      careType: "Walk-in Clinic",
      summary: "Based on your assessment, we recommend visiting a walk-in clinic for evaluation.",
      facilities: [],
    };
  }, []);

  // ── Flow handlers ──
  const handleAuthComplete = useCallback(() => {
    setFlowStep("questionnaire");
  }, []);

  const handleQuestionnaireComplete = useCallback((data: QuestionnaireData) => {
    setFlowStep("map");
    setShowToolbar(true);
    setUserSeverity(data.severity);
    setQuestionnaireData(data); // Save questionnaire data for report
    setAllowReportSubmission(true); // Enable report submission after questionnaire

    // Save symptoms if provided
    if (data.symptoms) {
      setLastSymptoms(data.symptoms);
    }

    // Set initial filter based on severity
    if (data.severity && data.severity >= 4) {
      setActiveFilter("er");
    } else if (data.severity && data.severity === 3) {
      setActiveFilter("walkin");
    } else if (data.severity && data.severity <= 2) {
      setActiveFilter("pharmacy");
    }

    // Auto-generate facilities immediately after questionnaire
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      const mockResult = generateFacilitiesBySeverity(center, data.severity);
      
      setTriageResult(mockResult);
      setSearchResult({
        urgency: mockResult.urgency,
        careType: mockResult.careType,
        answer: mockResult.summary,
        coordinates: [center.lng, center.lat],
        should_fly_to: false,
        zoom_level: null,
      });
      
      if (!data.symptoms) {
        setLastSymptoms("General assessment based on questionnaire");
      }
    }
  }, [generateFacilitiesBySeverity]);

  const handleQuestionnaireSkip = useCallback(() => {
    setFlowStep("map");
    setShowToolbar(true);
  }, []);

  // ── Search handler (optional - updates symptoms only) ──
  const handleSearch = useCallback(async () => {
    if (!mapRef.current || !searchQuery.trim()) return;

    setIsSearching(true);

    try {
      // Update symptoms for report (facilities already showing)
      setLastSymptoms(searchQuery.trim());
      
      // TODO: Replace with actual triage API call if needed
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Just update the search result message, keep facilities
      if (triageResult) {
        setSearchResult({
          urgency: triageResult.urgency,
          careType: triageResult.careType,
          answer: `Updated symptoms: ${searchQuery.trim()}. ${triageResult.summary}`,
          coordinates: mapRef.current.getCenter().toArray() as [number, number],
          should_fly_to: false,
          zoom_level: null,
        });
      }
      
      setSearchQuery("");
      console.log('✅ Symptoms updated:', searchQuery.trim());
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, triageResult]);

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
    const currentCoords: [number, number] = [center.lng, center.lat];
    
    // ALWAYS update the saved current location when adding the marker
    currentLocationRef.current = currentCoords;
    console.log('Adding blue marker and saving location:', currentCoords);

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

    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center',
      pitchAlignment: 'map',
      rotationAlignment: 'map',
    })
      .setLngLat(currentCoords)
      .addTo(mapRef.current);

    currentLocationMarkerRef.current = marker;
  }, []);

  // ── Clear route from map ──
  const clearRoute = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    // Remove all possible route layers (including old ones)
    const layersToRemove = ['route-bright', 'route-dashes', 'route', 'route-outline', 'route-to-pin'];
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
    
    // Remove sources after all layers are gone
    const sourcesToRemove = ['route', 'route-to-pin'];
    sourcesToRemove.forEach(sourceId => {
      if (map.getSource(sourceId)) {
        try {
          map.removeSource(sourceId);
          console.log(`Removed source: ${sourceId}`);
        } catch (error) {
          console.log(`Could not remove source ${sourceId}:`, error);
        }
      }
    });
  }, []);

  // ── Draw route from user location to facility ──
  const drawRoute = useCallback(async (destination: [number, number]) => {
    if (!mapRef.current) {
      console.error('Map not ready');
      return;
    }

    const map = mapRef.current;
    
    // Use saved current location or fallback to map center
    let startLng: number, startLat: number;
    if (currentLocationRef.current) {
      [startLng, startLat] = currentLocationRef.current;
      console.log('Using saved current location:', [startLng, startLat]);
    } else {
      const center = map.getCenter();
      startLng = center.lng;
      startLat = center.lat;
      console.log('Using map center as fallback:', [startLng, startLat]);
    }
    
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
        const coordinates = route.coordinates;
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
            'line-dasharray': [3, 4],
          },
        });

        console.log('Route layers added successfully');
        
        // Add a straight line from route end to exact destination pin
        const routeEnd = coordinates[coordinates.length - 1];
        const endToPin = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [routeEnd, [endLng, endLat]]
          }
        };
        
        map.addSource('route-to-pin', {
          type: 'geojson',
          data: endToPin as any,
        });
        
        map.addLayer({
          id: 'route-to-pin',
          type: 'line',
          source: 'route-to-pin',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#B91C1C',
            'line-width': 10,
            'line-opacity': 1.0,
            'line-dasharray': [3, 4],
          },
        });

        // Fit map to show entire route
        const bounds = coordinates.reduce(
          (bounds: mapboxgl.LngLatBounds, coord: [number, number]) => {
            return bounds.extend(coord as [number, number]);
          },
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );

        map.fitBounds(bounds, {
          padding: 80,
          duration: 1500,
        });
      } else {
        console.error('No routes found in response');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  }, [clearRoute]);

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

    // Don't zoom in - let fitBounds in drawRoute handle the view
  }, [drawRoute]);

  // ── Add red markers for suggested facilities ──
  const addFacilityMarkers = useCallback((facilities: TriageFacility[]) => {
    if (!mapRef.current) return;

    console.log('🔴 Adding facility markers:', facilities.length);
    clearMarkers();

    facilities.forEach((facility) => {
      const el = document.createElement('div');
      el.className = 'facility-marker';
      el.style.cursor = 'pointer';

      if (facility.type === 'Emergency Room') {
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.alignItems = 'center';
        el.style.width = 'max-content';
        el.innerHTML = `
          <div style="
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95));
            color: white;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.2);
          ">
            ${facility.waitTime}
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 6px solid rgba(185, 28, 28, 0.95);
          "></div>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" 
                  fill="#EF4444" 
                  stroke="#991B1B" 
                  stroke-width="0.5"/>
          </svg>
        `;
      } else {
        el.style.width = '32px';
        el.style.height = '32px';
        el.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" 
                  fill="#EF4444" 
                  stroke="#991B1B" 
                  stroke-width="0.5"/>
          </svg>
        `;
      }

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
        pitchAlignment: 'map',
        rotationAlignment: 'map',
      })
        .setLngLat(facility.coordinates)
        .addTo(mapRef.current!);

      console.log(`📍 Added marker for ${facility.name} at`, facility.coordinates);

      // Add click handler to select facility
      el.addEventListener('click', () => {
        handleFacilitySelect(facility);
      });

      markersRef.current.push(marker);
    });
    
    console.log('✅ Total markers added:', markersRef.current.length);
  }, [clearMarkers, handleFacilitySelect]);

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

  // ── Add markers when triage results change ──
  useEffect(() => {
    console.log('🎯 Marker effect triggered:', { 
      hasTriageResult: !!triageResult, 
      mapReady, 
      facilitiesCount: triageResult?.facilities?.length,
      mapLoaded: mapRef.current?.loaded()
    });
    
    if (triageResult && mapReady && mapRef.current) {
      console.log('✅ Will add facility markers:', triageResult.facilities);
      
      // Wait for map to be fully loaded and idle
      const addMarkers = () => {
        if (mapRef.current && mapRef.current.loaded()) {
          console.log('🔴 NOW adding markers to map');
          addFacilityMarkers(triageResult.facilities);
        } else {
          console.log('⚠️ Map not loaded yet, waiting...');
          setTimeout(addMarkers, 100);
        }
      };
      
      // Start attempting to add markers
      const timeoutId = setTimeout(addMarkers, 200);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [triageResult, mapReady, addFacilityMarkers]);

  // ── Auto-load ER map when coming from ER button ──
  useEffect(() => {
    if (!isERMap || !mapReady || !mapRef.current || erMapLoadedRef.current) return;
    
    console.log('🚨 ER auto-load: Loading facilities...');
    erMapLoadedRef.current = true;
    
    const center = mapRef.current.getCenter();
    const erResult = generateFacilitiesBySeverity(center, 5); // Severity 5 = Emergency
    
    console.log('📍 Generated ER facilities:', erResult.facilities);
    
    // Set all state at once
    setUserSeverity(5);
    setActiveFilter("er");
    setShowToolbar(true);
    setLastSymptoms("Emergency room search - direct access");
    
    setSearchResult({
      urgency: erResult.urgency,
      careType: erResult.careType,
      answer: erResult.summary,
      coordinates: [center.lng, center.lat],
      should_fly_to: false,
      zoom_level: null,
    });
    
    // Set triageResult to show panel
    setTriageResult(erResult);
    
    // Add markers directly after a short delay
    setTimeout(() => {
      console.log('🔴 Adding ER markers directly in auto-load effect');
      addFacilityMarkers(erResult.facilities);
    }, 500);
    
    console.log('✅ ER auto-load complete');
  }, [isERMap, mapReady, generateFacilitiesBySeverity, addFacilityMarkers]);

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
      
      // Save initial map center as current location
      const center = map.getCenter();
      currentLocationRef.current = [center.lng, center.lat];
      console.log('Map loaded, saved current location:', currentLocationRef.current);
      
      setMapReady(true);
    });

    // Fallback — some Mapbox versions fire style.load before load
    map.on("style.load", () => {
      if (!mapRef.current) {
        mapRef.current = map;
        
        // Save initial map center as current location
        const center = map.getCenter();
        currentLocationRef.current = [center.lng, center.lat];
        console.log('Map style loaded, saved current location:', currentLocationRef.current);
        
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
          showReportButton={allowReportSubmission}
          onShowRoute={() => {
            // Show report preview instead of immediate route
            const report = createReport(selectedFacility);
            setReportPreview(report);
          }}
        />
      )}

      {/* ── Search Result Popup ── */}
      {searchResult && !triageResult && (
        <SearchResultPopup
          result={searchResult}
          onClose={() => setSearchResult(null)}
        />
      )}

      {/* ── Search / Symptom Input Bar ── */}
      {flowStep === "map" && !triageResult && !isERMap && (
        <div
          data-search-container
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-[min(500px,calc(100vw-2rem))] lg:w-125 xl:w-137.5 2xl:w-150 glass rounded-2xl px-4 py-2 animate-slideUp"
        >
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            isLoading={isSearching}
            placeholder="Describe your symptoms (optional)..."
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
