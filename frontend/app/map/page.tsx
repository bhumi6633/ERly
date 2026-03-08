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
import { EvidenceModal } from "@/components/modals/EvidenceModal";

import { MAP_CONFIG, URGENCY_CONFIG } from "@/lib/constants";
import { matchesCareFilter } from "@/lib/utils";
import type {
  CareFilter,
  CareOption,
  CareOptionsResponse,
  TriageResult,
  TriageFacility,
  FacilityDetails,
  TriagePopupResult,
  QuestionnaireData,
  MedicalReport,
  WaitTimeSnapshot,
} from "@/lib/types";

// ── Flow Steps ──
type FlowStep = "auth" | "questionnaire" | "map";

// ── Ambulance marker SVG (shared, module-level) ───────────────────────────────
function ambulanceSvg(selected: boolean): string {
  const w = selected ? 52 : 44;
  const h = selected ? 40 : 34;
  const style = selected
    ? "filter:drop-shadow(0 0 8px rgba(239,68,68,0.75)) drop-shadow(0 2px 5px rgba(0,0,0,0.45));"
    : "filter:drop-shadow(0 2px 5px rgba(0,0,0,0.5));";
  return `<svg width="${w}" height="${h}" viewBox="0 0 52 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="${style}">
    <!-- Red body -->
    <rect x="2" y="7" width="40" height="22" rx="3" fill="#ef4444" stroke="#dc2626" stroke-width="1.5"/>
    <!-- Darker-red cab/front -->
    <path d="M36 7 L49 7 Q52 7 52 10 L52 24 Q52 29 49 29 L36 29 Z" fill="#dc2626" stroke="#b91c1c" stroke-width="1.5"/>
    <!-- Windshield -->
    <rect x="39" y="10" width="9" height="8" rx="1.5" fill="#bfdbfe" opacity="0.85"/>
    <!-- White cross -->
    <rect x="8"  y="15" width="16" height="4" rx="1" fill="white"/>
    <rect x="14" y="9"  width="4"  height="16" rx="1" fill="white"/>
    <!-- Emergency light bar -->
    <rect x="12" y="3"  width="8"  height="4" rx="2" fill="#fbbf24"/>
    <rect x="22" y="3"  width="8"  height="4" rx="2" fill="#3b82f6"/>
    <!-- Wheels -->
    <circle cx="11" cy="33" r="6" fill="#1f2937" stroke="#4b5563" stroke-width="1"/>
    <circle cx="38" cy="33" r="6" fill="#1f2937" stroke="#4b5563" stroke-width="1"/>
    <circle cx="11" cy="33" r="2.5" fill="#6b7280"/>
    <circle cx="38" cy="33" r="2.5" fill="#6b7280"/>
    <!-- Cab divider -->
    <line x1="35" y1="8" x2="35" y2="29" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
    <!-- Side window -->
    <rect x="4" y="12" width="8" height="8" rx="1" fill="white" opacity="0.2"/>
  </svg>`;
}

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
  const currentLocationRef = useRef<[number, number] | null>(null);
  const erMapLoadedRef = useRef(false);
  const ambulanceMarkersRef        = useRef<mapboxgl.Marker[]>([]);
  const ambulancesSetupRef         = useRef(false);
  const selectedAmbulancePosRef    = useRef<[number, number] | null>(null);

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
  const [showTriagePanel, setShowTriagePanel] = useState(false);
  const backboardRef = useRef<any>(null);
  const [backboardData, setBackboardData] = useState<any>(null);
  const [selectedFacility, setSelectedFacility] = useState<FacilityDetails | null>(null);
  const [userSeverity, setUserSeverity] = useState<number | null>(null);
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [lastSymptoms, setLastSymptoms] = useState<string>("");
  
  // ── Report state ──
  const [reportPreview, setReportPreview] = useState<MedicalReport | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [allowReportSubmission, setAllowReportSubmission] = useState(false);
  const [evidenceModalData, setEvidenceModalData] = useState<{ facilityName: string; snapshot: WaitTimeSnapshot } | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // ── Fetch real care options from backend ──────────────────────────────────
  const fetchCareOptions = useCallback(async (
    lat: number,
    lng: number,
    severity: number | null,
    overrideTypes?: string,
  ) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

    let types: string;
    if (severity === null || severity >= 4) {
      types = "hospital,er";
    } else if (severity === 3) {
      types = "urgent_care,clinic";
    } else {
      types = "clinic,pharmacy";
    }

    const urgency =
      severity === null || severity >= 4
        ? ("emergency" as const)
        : severity === 3
        ? ("urgent" as const)
        : ("low" as const);

    const careType =
      severity === null || severity >= 4
        ? "Emergency Room"
        : severity === 3
        ? "Walk-in Clinic"
        : "Pharmacy / Clinic";

    setIsFetching(true);
    try {
      const resp = await fetch(
        `${API_URL}/care-options/?lat=${lat}&lng=${lng}&radius_km=75&limit=20&types=${types}`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: CareOptionsResponse = await resp.json();

      const facilities: TriageFacility[] = data.facilities
        .filter((f: CareOption) => f.status !== "closed")
        .map((f: CareOption) => ({
        id: String(f.facility_id),
        name: f.name,
        type: f.type,
        address: f.address,
        coordinates: [f.longitude, f.latitude] as [number, number],
        distance:
          f.distance_km < 1
            ? `${Math.round(f.distance_km * 1000)} m`
            : `${f.distance_km.toFixed(1)} km`,
        waitTime:
          f.wait_time_minutes != null
            ? `${f.wait_time_minutes}m wait`
            : f.status === "closed"
            ? "Closed"
            : "~",
        careAccessTime: f.total_time_minutes ?? 9999,
        locationId: f.facility_id,
        travelTimeMinutes: f.travel_time_minutes,
        totalTimeMinutes: f.total_time_minutes ?? undefined,
      }));

      const summary =
        urgency === "emergency"
          ? "Nearby emergency facilities ranked by total time to care (drive + wait). Sources: live hospital feeds and CIHI-calibrated provincial benchmarks."
          : "Nearby care facilities ranked by total time to care (drive + wait). Sources: live feeds, public aggregators, and CIHI-calibrated benchmarks.";

      setTriageResult({ urgency, careType, summary, facilities });
      setShowTriagePanel(true);
      setAllowReportSubmission(true);

      if (facilities.length > 0) {
        setSearchResult({
          urgency,
          careType,
          answer: summary,
          coordinates: [lng, lat],
          should_fly_to: false,
          zoom_level: null,
        });
      }
    } catch (err) {
      console.error("care-options fetch failed:", err);
      setTriageResult({
        urgency: "medium",
        careType: careType ?? "Care",
        summary: "Could not reach the ERly backend. Make sure the API server is running.",
        facilities: [],
      });
      setShowTriagePanel(true);
    } finally {
      setIsFetching(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Flow handlers ──
  const handleAuthComplete = useCallback(() => {
    setFlowStep("questionnaire");
  }, []);

  // ── Questionnaire complete — wired to Backboard triage ───────────────────
  const handleQuestionnaireComplete = useCallback(async (data: QuestionnaireData) => {
    setFlowStep("map");
    setShowToolbar(true);
    setUserSeverity(data.severity);
    setQuestionnaireData(data);
    setAllowReportSubmission(true);

    if (data.symptoms) setLastSymptoms(data.symptoms);

    if (data.severity && data.severity >= 4) setActiveFilter("er");
    else if (data.severity && data.severity === 3) setActiveFilter("walkin");
    else if (data.severity && data.severity <= 2) setActiveFilter("pharmacy");

    const center = mapRef.current?.getCenter();
    const lat = center?.lat ?? 43.47;
    const lng = center?.lng ?? -80.54;

    fetchCareOptions(lat, lng, data.severity);

    if (!data.symptoms) setLastSymptoms("General assessment based on questionnaire");

    // ── Backboard triage ──────────────────────────────────────────────────
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const severityMap: Record<number, string> = { 1: "mild", 2: "minor", 3: "moderate", 4: "severe", 5: "critical" };
    const durationMap: Record<string, string> = { just_now: "just_now", few_hours: "few_hours", few_days: "few_days", week_or_more: "week_or_more" };

    let patientToken = localStorage.getItem("erly_patient_token");
    if (!patientToken) {
      patientToken = "patient_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("erly_patient_token", patientToken);
    }

    try {
      const sessionResp = await fetch(`${API_URL}/triage/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_latitude: lat, patient_longitude: lng, main_symptom: data.symptoms || "pending" }),
      });
      if (!sessionResp.ok) throw new Error("session failed");
      const session = await sessionResp.json();

      const assessResp = await fetch(`${API_URL}/triage/sessions/${session.id}/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          patient_token: patientToken,
          category: data.category ?? "other",
          severity: severityMap[data.severity ?? 3] ?? "moderate",
          duration: durationMap[data.duration ?? "just_now"] ?? "just_now",
          custom_text: data.symptoms ?? "",
        }),
      });
      if (!assessResp.ok) throw new Error("assess failed");
      const triage = await assessResp.json();

      const report = triage.report;
      backboardRef.current = triage;
      setBackboardData(triage);
      if (report?.chief_complaint) {
        setTriageResult((prev) =>
          prev ? {
            ...prev,
            summary: [report.chief_complaint, report.clinical_picture, report.recommended_action]
              .filter(Boolean).join(" — "),
            backboardReport: triage,
          } : prev
        );
        setLastSymptoms(report.chief_complaint);
      }

      if (triage.pattern_alert) console.warn("Pattern alert:", triage.pattern_alert);
      console.log("✅ Backboard:", triage.priority_level, triage.care_level);
    } catch (err) {
      console.error("Backboard failed (non-blocking):", err);
    }
  }, [fetchCareOptions]);

  const handleQuestionnaireSkip = useCallback(() => {
    setFlowStep("map");
    setShowToolbar(true);
  }, []);

  // ── Search handler ──
  const handleSearch = useCallback(async () => {
    if (!mapRef.current || !searchQuery.trim()) return;

    setIsSearching(true);

    try {
      setLastSymptoms(searchQuery.trim());
      await new Promise((resolve) => setTimeout(resolve, 500));

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

  // ── Toolbar filter → re-fetch backend with matching types ──
  const handleFilterChange = useCallback((filter: CareFilter) => {
    setActiveFilter(filter);
    const filterTypeMap: Record<CareFilter, string> = {
      all:         "hospital,er,urgent_care,clinic,pharmacy",
      er:          "hospital,er",
      urgent:      "urgent_care",
      walkin:      "clinic",
      telehealth:  "clinic",
      pharmacy:    "pharmacy",
      specialty:   "hospital",
    };
    const center = mapRef.current?.getCenter();
    if (center) {
      fetchCareOptions(center.lat, center.lng, userSeverity, filterTypeMap[filter]);
    }
  }, [fetchCareOptions, userSeverity]);

  // ── Clear existing markers ──
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  }, []);

  // ── Add current location marker (blue pulsing dot) ──
  const addCurrentLocationMarker = useCallback(() => {
    if (!mapRef.current) return;

    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.remove();
    }

    const coords: [number, number] = currentLocationRef.current ?? (() => {
      const c = mapRef.current!.getCenter();
      return [c.lng, c.lat] as [number, number];
    })();

    const el = document.createElement('div');
    el.className = 'current-location-marker';
    el.style.width = '50px';
    el.style.height = '50px';
    el.style.cursor = 'default';
    el.style.zIndex = '1000';
    
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
        <circle cx="25" cy="25" r="20" fill="#3B82F6" opacity="0.2">
          <animate attributeName="r" from="15" to="22" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="25" cy="25" r="14" fill="#3B82F6" opacity="0.4" filter="url(#glow)"/>
        <circle cx="25" cy="25" r="10" fill="#3B82F6" stroke="#1E40AF" stroke-width="2"/>
        <circle cx="25" cy="25" r="5" fill="#FFFFFF"/>
      </svg>
    `;

    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center',
      pitchAlignment: 'map',
      rotationAlignment: 'map',
    })
      .setLngLat(coords)
      .addTo(mapRef.current);

    currentLocationMarkerRef.current = marker;
  }, []);

  // ── Clear route from map ──
  const clearRoute = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    const layersToRemove = ['route-bright', 'route-dashes', 'route', 'route-outline', 'route-to-pin'];
    layersToRemove.forEach(layerId => {
      if (map.getLayer(layerId)) {
        try { map.removeLayer(layerId); } catch (error) {}
      }
    });
    
    const sourcesToRemove = ['route', 'route-to-pin'];
    sourcesToRemove.forEach(sourceId => {
      if (map.getSource(sourceId)) {
        try { map.removeSource(sourceId); } catch (error) {}
      }
    });
  }, []);

  // ── Remove ambulance route layers/source ──
  const clearAmbulanceRoute = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    ["ambulance-route-from-ambo", "ambulance-route-outline", "ambulance-route", "ambulance-route-to-user"].forEach((id) => {
      if (map.getLayer(id)) { try { map.removeLayer(id); } catch {} }
    });
    ["ambulance-route-from-ambo", "ambulance-route", "ambulance-route-to-user"].forEach((id) => {
      if (map.getSource(id)) { try { map.removeSource(id); } catch {} }
    });
  }, []);

  // ── Draw green path: selected ambulance → user location ──
  const drawAmbulanceRoute = useCallback(async (from: [number, number]) => {
    if (!mapRef.current || !currentLocationRef.current) return;
    const map = mapRef.current;
    const [toLng, toLat] = currentLocationRef.current;
    const [fromLng, fromLat] = from;
    clearAmbulanceRoute();
    await new Promise((r) => setTimeout(r, 150));
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (!data.routes?.length) return;
      const geometry = data.routes[0].geometry;
      const coords: [number, number][] = geometry.coordinates;

      // Straight connector: exact ambulance position → road-snapped route start
      const routeStart = coords[0];
      map.addSource("ambulance-route-from-ambo", {
        type: "geojson",
        data: {
          type: "Feature", properties: {},
          geometry: { type: "LineString", coordinates: [[fromLng, fromLat], routeStart] },
        } as any,
      });
      map.addLayer({
        id: "ambulance-route-from-ambo",
        type: "line",
        source: "ambulance-route-from-ambo",
        slot: "top",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#22c55e", "line-width": 5, "line-opacity": 0.9, "line-emissive-strength": 1 },
      });

      map.addSource("ambulance-route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry },
      });
      map.addLayer({
        id: "ambulance-route-outline",
        type: "line",
        source: "ambulance-route",
        slot: "top",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#4ade80", "line-width": 10, "line-opacity": 0.22, "line-emissive-strength": 1 },
      });
      map.addLayer({
        id: "ambulance-route",
        type: "line",
        source: "ambulance-route",
        slot: "top",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#22c55e", "line-width": 5, "line-opacity": 0.9, "line-emissive-strength": 1 },
      });

      // Straight connector: road-snapped endpoint → exact GPS blue dot
      const routeEnd = coords[coords.length - 1];
      map.addSource("ambulance-route-to-user", {
        type: "geojson",
        data: {
          type: "Feature", properties: {},
          geometry: { type: "LineString", coordinates: [routeEnd, [toLng, toLat]] },
        } as any,
      });
      map.addLayer({
        id: "ambulance-route-to-user",
        type: "line",
        source: "ambulance-route-to-user",
        slot: "top",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#22c55e", "line-width": 5, "line-opacity": 0.9, "line-emissive-strength": 1 },
      });
    } catch (e) {
      console.error("Ambulance route error:", e);
    }
  }, [clearAmbulanceRoute]);

  // ── Remove all ambulance markers + their route ──
  const clearAmbulances = useCallback(() => {
    ambulanceMarkersRef.current.forEach((m) => m.remove());
    ambulanceMarkersRef.current = [];
    clearAmbulanceRoute();
  }, [clearAmbulanceRoute]);

  // ── Spawn ambulances around user — only for severity 4 / 5 ──
  const addAmbulanceMarkers = useCallback(() => {
    if (!mapRef.current) return;
    clearAmbulances();

    const [baseLng, baseLat] = currentLocationRef.current ?? (() => {
      const c = mapRef.current!.getCenter();
      return [c.lng, c.lat] as [number, number];
    })();

    const jitter = () => (Math.random() - 0.5) * 0.004;
    // 5 positions scattered 0.5–2 km in different directions
    const deltas: [number, number][] = [
      [ 0.013,  0.007],  // ENE — selected (closest)
      [-0.009,  0.011],  // NNW
      [ 0.007, -0.014],  // SSE
      [-0.016, -0.006],  // WSW
      [ 0.020, -0.003],  // E
    ];
    const positions = deltas.map(([dlng, dlat]): [number, number] => [
      baseLng + dlng + jitter(),
      baseLat + dlat + jitter(),
    ]);

    const selectedIdx = 0;
    const eta = Math.floor(2 + Math.random() * 5); // 2–6 min ETA
    selectedAmbulancePosRef.current = positions[selectedIdx];

    positions.forEach((pos, idx) => {
      const isSelected = idx === selectedIdx;
      const el = document.createElement("div");
      el.style.cssText = "position:relative;display:flex;flex-direction:column;align-items:center;cursor:default;";

      if (isSelected) {
        el.innerHTML = `
          <div style="
            background:#ffffff;
            border:2.5px solid #22c55e;
            border-radius:12px;
            padding:5px 13px;
            font-size:13px;
            font-weight:800;
            color:#16a34a;
            white-space:nowrap;
            box-shadow:0 3px 12px rgba(0,0,0,0.28),0 0 0 4px rgba(34,197,94,0.18);
            font-family:ui-sans-serif,system-ui,sans-serif;
            letter-spacing:0.01em;
            position:relative;
            margin-bottom:4px;
          ">
            ETA: ${eta} min
            <div style="position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #22c55e;"></div>
            <div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid white;"></div>
          </div>
          ${ambulanceSvg(true)}`;
      } else {
        el.innerHTML = ambulanceSvg(false);
      }

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "bottom",
        pitchAlignment: "map",
        rotationAlignment: "map",
      })
        .setLngLat(pos)
        .addTo(mapRef.current!);

      ambulanceMarkersRef.current.push(marker);
    });

    // Green route: selected ambulance → user
    drawAmbulanceRoute(positions[selectedIdx]);
  }, [clearAmbulances, drawAmbulanceRoute]);

  // ── Draw route from user location to facility ──
  const drawRoute = useCallback(async (destination: [number, number]) => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    let startLng: number, startLat: number;

    if (currentLocationRef.current) {
      [startLng, startLat] = currentLocationRef.current;
    } else {
      const center = map.getCenter();
      startLng = center.lng;
      startLat = center.lat;
    }
    
    const [endLng, endLat] = destination;

    try {
      clearRoute();
      await new Promise(resolve => setTimeout(resolve, 200));

      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0].geometry;
        const coordinates = route.coordinates;

        if (map.getSource('route')) {
          clearRoute();
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: route },
        });

        // Route casing — white glow behind the main line
        map.addLayer({
          id: 'route-outline',
          type: 'line',
          source: 'route',
          slot: 'top',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 10,
            'line-opacity': 0.3,
            'line-emissive-strength': 1,
          },
        });

        // Main navigation line — sky-400, emissive so night lighting doesn't darken it
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          slot: 'top',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#38BDF8',
            'line-width': 6,
            'line-opacity': 1.0,
            'line-emissive-strength': 1,
          },
        });

        const routeEnd = coordinates[coordinates.length - 1];
        map.addSource('route-to-pin', {
          type: 'geojson',
          data: {
            type: 'Feature', properties: {},
            geometry: { type: 'LineString', coordinates: [routeEnd, [endLng, endLat]] }
          } as any,
        });
        
        map.addLayer({
          id: 'route-to-pin',
          type: 'line',
          source: 'route-to-pin',
          slot: 'top',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#38BDF8',
            'line-width': 6,
            'line-opacity': 1.0,
            'line-emissive-strength': 1,
          },
        });

        const bounds = coordinates.reduce(
          (bounds: mapboxgl.LngLatBounds, coord: [number, number]) =>
            bounds.extend(coord as [number, number]),
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );
        map.fitBounds(bounds, { padding: 80, duration: 1500 });
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  }, [clearRoute]);

  // ── Facility selection ──
  const handleFacilitySelect = useCallback((facility: TriageFacility) => {
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
      locationId: facility.locationId,
      travelTimeMinutes: facility.travelTimeMinutes,
      totalTimeMinutes: facility.totalTimeMinutes,
    };
    
    setSelectedFacility(facilityDetails);
    drawRoute(facility.coordinates);
  }, [drawRoute]);

  // ── Add red markers for suggested facilities ──
  const addFacilityMarkers = useCallback((facilities: TriageFacility[]) => {
    if (!mapRef.current) return;

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
          <div style="background:linear-gradient(135deg,rgba(239,68,68,0.95),rgba(185,28,28,0.95));color:white;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.2);">
            ${facility.waitTime}
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid rgba(185,28,28,0.95);"></div>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#EF4444" stroke="#991B1B" stroke-width="0.5"/>
          </svg>
        `;
      } else {
        el.style.width = '32px';
        el.style.height = '32px';
        el.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#EF4444" stroke="#991B1B" stroke-width="0.5"/>
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

      el.addEventListener('click', () => handleFacilitySelect(facility));
      markersRef.current.push(marker);
    });
  }, [clearMarkers, handleFacilitySelect]);

  // ── Create medical report ──
  const createReport = useCallback((facility: FacilityDetails): MedicalReport => {
    const severity = questionnaireData?.severity || 3;
    const category = questionnaireData?.otherCategory || questionnaireData?.category || "general";
    const duration = questionnaireData?.duration || "unknown";
    
    let urgency: "low" | "medium" | "high" = "medium";
    if (severity <= 2) urgency = "low";
    else if (severity >= 4) urgency = "high";
    
    const urgencyConfig = URGENCY_CONFIG[urgency];
    const severityLabels = ["", "Mild", "Minor", "Moderate", "Severe", "Critical"];

    return {
      patientInfo: { timestamp: new Date().toISOString() },
      assessment: {
        category,
        severity,
        severityLabel: severityLabels[severity] || "Unknown",
        duration,
        symptoms: lastSymptoms || "Not specified",
        urgencyLevel: urgency,
        urgencyLabel: urgencyConfig.label,
      },
      recommendation: {
        careType: triageResult?.careType || "General Care",
        summary: backboardData?.report?.clinical_picture ? `${backboardData.report.chief_complaint} — ${backboardData.report.clinical_picture} — ${backboardData.report.recommended_action}` : triageResult?.summary || "Please visit the facility for evaluation",
      },
      selectedFacility: {
        id: facility.id,
        name: facility.name,
        type: facility.type,
        address: facility.address,
      },
    };
  }, [questionnaireData, lastSymptoms, triageResult, backboardData]);

  // ── Add markers when triage results change or filter changes ──
  useEffect(() => {
    if (triageResult && mapReady && mapRef.current) {
      const filteredFacilities = activeFilter === "all"
        ? triageResult.facilities
        : triageResult.facilities.filter(f => matchesCareFilter(f.type, activeFilter));

      // Wait for map to be fully loaded and idle
      const addMarkers = () => {
        if (mapRef.current && mapRef.current.loaded()) {
          addFacilityMarkers(filteredFacilities);
        } else {
          setTimeout(addMarkers, 100);
        }
      };
      
      const timeoutId = setTimeout(addMarkers, 200);
      return () => { clearTimeout(timeoutId); };
    }
  }, [triageResult, mapReady, activeFilter, addFacilityMarkers]);

  // ── Ambulance overlay — severity 4 or 5 only ──────────────────────────────
  useEffect(() => {
    const isUrgent = userSeverity != null && userSeverity >= 4;
    if (mapReady && flowStep === "map" && triageResult && isUrgent) {
      // Guard: only set up once per session (triageResult ref changes on Backboard merge)
      if (!ambulancesSetupRef.current) {
        ambulancesSetupRef.current = true;
        const t = setTimeout(addAmbulanceMarkers, 900);
        return () => clearTimeout(t);
      }
    } else {
      if (ambulancesSetupRef.current) {
        ambulancesSetupRef.current = false;
        clearAmbulances();
      }
    }
  }, [mapReady, flowStep, triageResult, userSeverity, addAmbulanceMarkers, clearAmbulances]);

  // ── Request geolocation ──
  useEffect(() => {
    if (!mapReady) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        currentLocationRef.current = [longitude, latitude];

        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 13,
          duration: 1200,
          essential: true,
        });

        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.setLngLat([longitude, latitude]);
        }

        // Redraw ambulance → user route so it ends exactly at the GPS blue dot
        if (ambulancesSetupRef.current && selectedAmbulancePosRef.current) {
          setTimeout(() => drawAmbulanceRoute(selectedAmbulancePosRef.current!), 300);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, drawAmbulanceRoute]);

  // ── Auto-load ER map ──
  useEffect(() => {
    if (!isERMap || !mapReady || !mapRef.current || erMapLoadedRef.current) return;
    erMapLoadedRef.current = true;
    const center = mapRef.current.getCenter();
    setUserSeverity(5);
    setActiveFilter("er");
    setShowToolbar(true);
    setLastSymptoms("Emergency room search - direct access");
    fetchCareOptions(center.lat, center.lng, 5);
  }, [isERMap, mapReady, fetchCareOptions, addFacilityMarkers]);

  // ── Map initialization ──

  // Merge Backboard result once triageResult is set by fetchCareOptions
  useEffect(() => {
    if (triageResult && backboardRef.current) {
      const triage = backboardRef.current;
      const report = triage.report;
      if (report?.chief_complaint) {
        setTriageResult((prev) => prev ? {
          ...prev,
          summary: [report.chief_complaint, report.clinical_picture, report.recommended_action].filter(Boolean).join(" — "),
          backboardReport: triage,
        } : prev);
        setLastSymptoms(report.chief_complaint);
      }
      backboardRef.current = null;
    }
  }, [triageResult]);
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
      const center = map.getCenter();
      currentLocationRef.current = [center.lng, center.lat];
      setMapReady(true);
    });

    map.on("style.load", () => {
      if (!mapRef.current) {
        mapRef.current = map;
        const center = map.getCenter();
        currentLocationRef.current = [center.lng, center.lat];
        setMapReady(true);
      }
    });
  }, []);

  // ── Show/hide current location marker ──
  useEffect(() => {
    const shouldShowPin = mapReady && 
                         flowStep === "map" && 
                         !reportPreview && 
                         !showSuccessModal &&
                         !evidenceModalData;
    
    if (shouldShowPin) {
      addCurrentLocationMarker();
    } else {
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.remove();
        currentLocationMarkerRef.current = null;
      }
    }
  }, [mapReady, flowStep, reportPreview, showSuccessModal, evidenceModalData, addCurrentLocationMarker]);

  return (
    <div className="relative h-screen w-full">
      <div ref={mapContainer} className="h-full w-full" />

      {/* ── Filter Toolbar (shown only when triage results are available) ── */}
      {showToolbar && flowStep === "map" && !!triageResult && (
        <Toolbar activeFilter={activeFilter} onFilterChange={handleFilterChange} />
      )}

      {mapReady && <MapControls map={mapRef.current} />}

      {/* ── Triage Results Panel (Left) ── */}
      {triageResult && showTriagePanel && (() => {
        const displayedFacilities = activeFilter === "all"
          ? triageResult.facilities
          : triageResult.facilities.filter(f => matchesCareFilter(f.type, activeFilter));
        const displayedResult = { ...triageResult, facilities: displayedFacilities };
        return (
          <TriageResultsPanel
            result={displayedResult}
            isRefetching={isFetching}
            onClose={() => setShowTriagePanel(false)}
            onFacilitySelect={handleFacilitySelect}
          />
        );
      })()}

      {/* ── Reopen FAB (when panel is hidden but results exist) ── */}
      {triageResult && !showTriagePanel && flowStep === "map" && (
        <button
          onClick={() => setShowTriagePanel(true)}
          className="absolute top-16 left-4 z-20 flex items-center gap-2.5 glass rounded-2xl px-5 py-3 text-white hover:text-white transition-all duration-200 animate-slideUp hover:scale-105 shadow-lg border border-white/[0.15]"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          <span className="text-sm font-semibold">{triageResult.facilities.length} facilities nearby</span>
        </button>
      )}

      {selectedFacility && (
        <FacilityDetailsPanel
          facility={selectedFacility}
          onClose={() => {
            setSelectedFacility(null);
            clearRoute();
          }}
          accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""}
          showReportButton={allowReportSubmission}
          onShowEvidence={(snap) => setEvidenceModalData({ facilityName: selectedFacility.name, snapshot: snap })}
          onShowRoute={() => {
            const report = createReport(selectedFacility);
            setReportPreview(report);
          }}
        />
      )}

      {searchResult && !triageResult && (
        <SearchResultPopup
          result={searchResult}
          onClose={() => setSearchResult(null)}
        />
      )}

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

      {flowStep === "auth" && (
        <AuthModal onContinueAsGuest={handleAuthComplete} />
      )}

      {flowStep === "questionnaire" && (
        <QuestionnaireModal
          onComplete={handleQuestionnaireComplete}
          onSkip={handleQuestionnaireSkip}
        />
      )}

      {reportPreview && (
        <ReportPreviewModal
          report={reportPreview}
          onConfirm={() => {
            setReportPreview(null);
            setShowSuccessModal(true);
          }}
          onCancel={() => setReportPreview(null)}
        />
      )}

      {showSuccessModal && selectedFacility && (
        <ReportSuccessModal
          facilityName={selectedFacility.name}
          onClose={() => {
            setShowSuccessModal(false);
            setAllowReportSubmission(false);
            if (selectedFacility) {
              drawRoute(selectedFacility.coordinates);
            }
          }}
          onGoHome={() => {
            setShowSuccessModal(false);
            setAllowReportSubmission(false);
            setSelectedFacility(null);
            setTriageResult(null);
            setShowTriagePanel(false);
            clearRoute();
          }}
        />
      )}
      {/* ── Evidence Modal (rendered at root to avoid transform clipping) ── */}
      {evidenceModalData && (
        <EvidenceModal
          facilityName={evidenceModalData.facilityName}
          snapshot={evidenceModalData.snapshot}
          onClose={() => setEvidenceModalData(null)}
        />
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-black" />}>
      <MapPageInner />
    </Suspense>
  );
}

function setShowTriagePanel(arg0: boolean) {
  throw new Error("Function not implemented.");
}
