"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import { Navigation2 } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

import { Toolbar } from "@/components/map/Toolbar";
import { SearchBar } from "@/components/map/SearchBar";
import { SearchResultPopup } from "@/components/map/SearchResultPopup";
import { MapControls } from "@/components/map/MapControls";
import { TriageResultsPanel } from "@/components/panels/TriageResultsPanel";
import { FacilityDetailsPanel } from "@/components/panels/FacilityDetailsPanel";
import { NavigationPanel } from "@/components/panels/NavigationPanel";
import { AuthModal } from "@/components/modals/AuthModal";
import { QuestionnaireModal } from "@/components/modals/QuestionnaireModal";
import { ReportPreviewModal } from "@/components/modals/ReportPreviewModal";
import { ReportSuccessModal } from "@/components/modals/ReportSuccessModal";
import { EvidenceModal } from "@/components/modals/EvidenceModal";

import { getApiUrl, API_FETCH_TIMEOUT_MS } from "@/lib/api";
import { MAP_CONFIG, URGENCY_CONFIG, TELEHEALTH_SERVICES } from "@/lib/constants";
import { matchesCareFilter, formatMinutes } from "@/lib/utils";
import type {
  CareFilter,
  CareOption,
  CareOptionsResponse,
  TriageResult,
  TriageFacility,
  FacilityDetails,
  NavigationData,
  NavigationStep,
  TriagePopupResult,
  QuestionnaireData,
  MedicalReport,
  WaitTimeSnapshot,
} from "@/lib/types";

// ── Flow Steps ──
type FlowStep = "auth" | "questionnaire" | "map";

/** Compute compass bearing (0-360) from one [lng, lat] to another */
function computeBearing(from: [number, number], to: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = from.map(toRad);
  const [lng2, lat2] = to.map(toRad);
  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

// ── Draw ambulance icon to an offscreen canvas → Mapbox image (WebGL) ─────────
// Returns a raw ImageData-like object accepted by map.addImage().
function makeAmbulanceCanvasImage(selected: boolean): HTMLCanvasElement {
  const W = 80, H = 64;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Drop shadow
  ctx.shadowColor = selected ? "rgba(239,68,68,0.7)" : "rgba(0,0,0,0.55)";
  ctx.shadowBlur = selected ? 10 : 6;

  // Scale SVG coords (52×40 → 72×56 with 4px padding)
  const sx = 72 / 52, sy = 56 / 40;
  ctx.save();
  ctx.translate(4, 4);
  ctx.scale(sx, sy);

  // Body (red)
  ctx.fillStyle = "#ef4444";
  ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1.5;
  ctx.beginPath(); roundRect(ctx, 2, 7, 40, 22, 3); ctx.fill(); ctx.stroke();

  // Cab/front
  ctx.fillStyle = "#dc2626"; ctx.strokeStyle = "#b91c1c";
  ctx.beginPath();
  ctx.moveTo(36,7); ctx.lineTo(49,7); ctx.quadraticCurveTo(52,7,52,10);
  ctx.lineTo(52,24); ctx.quadraticCurveTo(52,29,49,29); ctx.lineTo(36,29); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Windshield
  ctx.fillStyle = "rgba(191,219,254,0.85)"; ctx.strokeStyle = "transparent";
  ctx.beginPath(); roundRect(ctx, 39, 10, 9, 8, 1.5); ctx.fill();

  // White cross
  ctx.fillStyle = "white"; ctx.shadowBlur = 0;
  ctx.beginPath(); roundRect(ctx, 8, 15, 16, 4, 1); ctx.fill();
  ctx.beginPath(); roundRect(ctx, 14, 9, 4, 16, 1); ctx.fill();

  // Light bar
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath(); roundRect(ctx, 12, 3, 8, 4, 2); ctx.fill();
  ctx.fillStyle = "#3b82f6";
  ctx.beginPath(); roundRect(ctx, 22, 3, 8, 4, 2); ctx.fill();

  // Wheels
  [[11,33],[38,33]].forEach(([cx,cy]) => {
    ctx.fillStyle = "#1f2937"; ctx.strokeStyle = "#4b5563"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#6b7280";
    ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI*2); ctx.fill();
  });

  // Cab divider
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(35,8); ctx.lineTo(35,29); ctx.stroke();

  // Side window
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath(); roundRect(ctx, 4, 12, 8, 8, 1); ctx.fill();

  ctx.restore();
  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
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
  const pendingAutoSelectRef = useRef(false);
  // Navigation extras
  const navPuckRef = useRef<mapboxgl.Marker | null>(null);
  const navAnimFrameRef = useRef<number | null>(null);
  const navAnimStepRef = useRef(0);
  const navAutoTrafficRef = useRef(false);
  // Ambulance tracking (WebGL layer-based — no DOM markers)
  const ambulancesSetupRef         = useRef(false);
  const selectedAmbulancePosRef    = useRef<[number, number] | null>(null);
  // Cached positions — computed once per session. Only cleared when GPS fires.
  const ambulancePosRef            = useRef<[number, number][] | null>(null);
  // ETA popup for the selected ambulance (HTML popup, never moves until removed)
  const ambulancePopupRef          = useRef<mapboxgl.Popup | null>(null);

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

  // ── Navigation state ──
  type NavPhase = 'idle' | 'loading' | 'celebrating' | 'navigating';
  const [navPhase, setNavPhase] = useState<NavPhase>('idle');
  const [navigationData, setNavigationData] = useState<NavigationData | null>(null);
  const isNavigating = navPhase !== 'idle';
  const [navShowTraffic, setNavShowTraffic] = useState(true);

  // ── Isochrone + geocoding state ──
  const [isochroneTarget, setIsochroneTarget] = useState<[number, number] | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [geocodeResults, setGeocodeResults] = useState<{ id: string; placeName: string; center: [number, number] }[]>([]);

  // ── Auto-select: set to true when fresh triage results arrive ──
  const autoSelectFirstRef = useRef(false);

  // ── Fetch real care options from backend ──────────────────────────────────
  const fetchCareOptions = useCallback(async (
    lat: number,
    lng: number,
    severity: number | null,
    overrideTypes?: string,
  ) => {
    const API_URL = getApiUrl();

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS);
      const resp = await fetch(
        `${API_URL}/care-options/?lat=${lat}&lng=${lng}&radius_km=75&limit=20&types=${types}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
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
        phone: f.phone ?? undefined,
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

      // ── Time Saved vs ER calculation ──────────────────────────────────────
      let timeSavedMinutes: number | null = null;
      let nearestErTotalMinutes: number | null = null;
      if (urgency !== "emergency" && facilities.length > 0) {
        try {
          const erResp = await fetch(
            `${API_URL}/care-options/?lat=${lat}&lng=${lng}&radius_km=75&limit=5&types=hospital,er`
          );
          if (erResp.ok) {
            const erData: CareOptionsResponse = await erResp.json();
            const nearestEr = erData.facilities.find(
              (f: CareOption) => f.status !== "closed" && f.total_time_minutes != null
            );
            nearestErTotalMinutes = nearestEr?.total_time_minutes ?? null;
            const bestNonErTotal = facilities[0]?.totalTimeMinutes ?? null;
            if (nearestErTotalMinutes && bestNonErTotal && nearestErTotalMinutes > bestNonErTotal + 20) {
              timeSavedMinutes = Math.round(nearestErTotalMinutes - bestNonErTotal);
            }
          }
        } catch { /* non-blocking — don't let ER comparison fail the main result */ }
      }

      setTriageResult({ urgency, careType, summary, facilities, timeSavedMinutes, nearestErTotalMinutes });
      autoSelectFirstRef.current = true; // auto-select top facility when panel loads
      setShowTriagePanel(true);
      setAllowReportSubmission(true);
      // Trigger isochrone reachability rings from this location
      setIsochroneTarget([lng, lat]);

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

    // Telehealth: show virtual service directory, no backend fetch
    if (filter === "telehealth") {
      setSelectedFacility(null);
      setTriageResult({
        urgency: "low",
        careType: "Telehealth",
        summary: "Virtual care options available across Ontario. Call or visit their website to connect with a healthcare provider from home.",
        facilities: TELEHEALTH_SERVICES,
      });
      setShowTriagePanel(true);
      return;
    }

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
      pendingAutoSelectRef.current = filter !== "all";
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
      pitchAlignment: 'viewport',
      rotationAlignment: 'viewport',
    })
      .setLngLat(coords)
      .addTo(mapRef.current);

    currentLocationMarkerRef.current = marker;
  }, []);

  // ── Clear route from map ──
  const clearRoute = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    const layersToRemove = ['route-dash', 'route-bright', 'route-dashes', 'route', 'route-outline', 'route-to-pin'];
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

  // ── Navigation traffic + recenter callbacks ──
  const enableNavTraffic = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      try {
        if (!map.getSource('mapbox-traffic')) {
          map.addSource('mapbox-traffic', { type: 'vector', url: 'mapbox://mapbox.mapbox-traffic-v1' });
        }
        if (!map.getLayer('traffic')) {
          map.addLayer({
            id: 'traffic', type: 'line', source: 'mapbox-traffic', 'source-layer': 'traffic',
            paint: {
              'line-color': ['match', ['get', 'congestion'],
                'low', '#22C55E', 'moderate', '#FBBF24', 'heavy', '#F87171', 'severe', '#DC2626', '#94a3b8',
              ] as any,
              'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 14, 4] as any,
              'line-opacity': 0.9,
            },
          });
        } else {
          map.setLayoutProperty('traffic', 'visibility', 'visible');
        }
        navAutoTrafficRef.current = true;
      } catch { /* ignore */ }
    };
    // Wait for style to be fully loaded before adding layers
    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('styledata', apply);
    }
  }, []);

  const disableNavTraffic = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (map.getLayer('traffic')) map.setLayoutProperty('traffic', 'visibility', 'none');
    } catch { /* ignore */ }
    navAutoTrafficRef.current = false;
  }, []);

  const handleNavRecenter = useCallback(() => {
    if (!mapRef.current || !navigationData?.startCoords) return;
    mapRef.current.flyTo({
      center: navigationData.startCoords,
      zoom: 16.5, pitch: 60,
      bearing: navigationData.initialBearing ?? 0,
      duration: 1200, essential: true,
    });
  }, [navigationData]);

  const handleNavOverview = useCallback(() => {
    if (!mapRef.current || !navigationData?.startCoords) return;
    mapRef.current.easeTo({
      center: navigationData.startCoords,
      zoom: 12, pitch: 30, bearing: 0, duration: 1000,
    });
  }, [navigationData]);

  const handleNavToggleTraffic = useCallback(() => {
    setNavShowTraffic(prev => {
      const next = !prev;
      if (next) enableNavTraffic();
      else disableNavTraffic();
      return next;
    });
  }, [enableNavTraffic, disableNavTraffic]);

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

  // ── Remove all ambulance GL layers/sources + ETA popup + route ──
  const clearAmbulances = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      ["ambulances-selected", "ambulances-normal"].forEach(id => {
        if (map.getLayer(id)) try { map.removeLayer(id); } catch {}
      });
      if (map.getSource("ambulances")) try { map.removeSource("ambulances"); } catch {}
    }
    if (ambulancePopupRef.current) {
      ambulancePopupRef.current.remove();
      ambulancePopupRef.current = null;
    }
    clearAmbulanceRoute();
  }, [clearAmbulanceRoute]);

  // ── Spawn ambulances — WebGL symbol layer (zero drift on zoom/pitch) ──
  const addAmbulanceMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    clearAmbulances();

    // Compute positions once and cache — never recompute until GPS clears cache.
    if (!ambulancePosRef.current) {
      // Wait until GPS resolves; fall back to map center only as last resort.
      const [baseLng, baseLat] = currentLocationRef.current ?? [map.getCenter().lng, map.getCenter().lat];
      const jitter = () => (Math.random() - 0.5) * 0.004;
      const deltas: [number, number][] = [
        [ 0.013,  0.007],  // ENE — selected (closest ETA)
        [-0.009,  0.011],  // NNW
        [ 0.007, -0.014],  // SSE
        [-0.016, -0.006],  // WSW
        [ 0.020, -0.003],  // E
      ];
      ambulancePosRef.current = deltas.map(([dlng, dlat]): [number, number] => [
        baseLng + dlng + jitter(),
        baseLat + dlat + jitter(),
      ]);
    }

    const positions = ambulancePosRef.current;
    const selectedIdx = 0;
    const eta = Math.floor(2 + Math.random() * 5);
    selectedAmbulancePosRef.current = positions[selectedIdx];

    // Register icon images once (idempotent — Mapbox ignores duplicate addImage).
    const registerIcon = (id: string, selected: boolean) => {
      if (!map.hasImage(id)) {
        const canvas = makeAmbulanceCanvasImage(selected);
        const ctx = canvas.getContext("2d")!;
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        map.addImage(id, { width: canvas.width, height: canvas.height, data: new Uint8Array(img.data.buffer) });
      }
    };
    registerIcon("ambulance-selected", true);
    registerIcon("ambulance-normal", false);

    // Build GeoJSON FeatureCollection.
    const features: GeoJSON.Feature<GeoJSON.Point, { selected: boolean }>[] = positions.map((pos, i) => ({
      type: "Feature",
      properties: { selected: i === selectedIdx },
      geometry: { type: "Point", coordinates: pos },
    }));

    map.addSource("ambulances", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });

    // Normal (non-selected) vehicles — rendered below selected.
    map.addLayer({
      id: "ambulances-normal",
      type: "symbol",
      source: "ambulances",
      filter: ["==", ["get", "selected"], false],
      layout: {
        "icon-image": "ambulance-normal",
        "icon-size": 0.55,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        // Keep icon flat in world space — no viewport drift.
        "icon-pitch-alignment": "map",
        "icon-rotation-alignment": "map",
      },
    });

    // Selected vehicle — rendered on top.
    map.addLayer({
      id: "ambulances-selected",
      type: "symbol",
      source: "ambulances",
      filter: ["==", ["get", "selected"], true],
      layout: {
        "icon-image": "ambulance-selected",
        "icon-size": 0.65,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-pitch-alignment": "map",
        "icon-rotation-alignment": "map",
      },
    });

    // ETA callout popup anchored to selected ambulance.
    ambulancePopupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: [0, -52],
      className: "ambulance-eta-popup",
    })
      .setLngLat(positions[selectedIdx])
      .setHTML(`<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;font-weight:800;color:#16a34a;white-space:nowrap;">🚑 ETA: ${eta} min</div>`)
      .addTo(map);

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

  // ── Draw route from a pre-fetched GeoJSON geometry ──
  // congestionPerPair: per-coordinate-pair congestion labels from Mapbox Directions annotations
  const drawRouteFromGeometry = useCallback((
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geometry: any,
    destination: [number, number],
    congestionPerPair?: string[],
  ) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    clearRoute();

    setTimeout(() => {
      try {
        if (map.getSource('route')) return;

        const coords: [number, number][] = geometry.coordinates;

        // Build congestion-segmented FeatureCollection so each segment can be
        // individually colored by traffic severity (green/yellow/red).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let routeData: any;
        if (congestionPerPair && congestionPerPair.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const features: any[] = [];
          let currentCong = congestionPerPair[0] ?? 'unknown';
          let segCoords: [number, number][] = [coords[0]];
          for (let i = 1; i < coords.length; i++) {
            segCoords.push(coords[i]);
            const nextCong = i < congestionPerPair.length ? (congestionPerPair[i] ?? 'unknown') : 'unknown';
            if (nextCong !== currentCong || i === coords.length - 1) {
              features.push({ type: 'Feature', properties: { congestion: currentCong }, geometry: { type: 'LineString', coordinates: segCoords } });
              currentCong = nextCong;
              segCoords = [coords[i]];
            }
          }
          routeData = { type: 'FeatureCollection', features };
        } else {
          routeData = { type: 'Feature', properties: { congestion: 'unknown' }, geometry };
        }

        // ── Background glow ──
        map.addSource('route', { type: 'geojson', data: routeData });
        map.addLayer({
          id: 'route-outline', type: 'line', source: 'route', slot: 'top',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#0EA5E9', 'line-width': 14, 'line-opacity': 0.18, 'line-emissive-strength': 1 },
        });
        // ── Main route — color-coded by congestion (green=low, yellow=moderate, red=heavy) ──
        map.addLayer({
          id: 'route', type: 'line', source: 'route', slot: 'top',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            'line-color': ['match', ['get', 'congestion'] as any,
              'low',      '#22C55E',
              'moderate', '#FBBF24',
              'heavy',    '#F87171',
              'severe',   '#DC2626',
              /* default */ '#38BDF8',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ] as any,
            'line-width': 7,
            'line-opacity': 1.0,
            'line-emissive-strength': 1,
          },
        });
        // ── Animated dash layer on top — gives flowing "moving" feel ──
        map.addLayer({
          id: 'route-dash', type: 'line', source: 'route', slot: 'top',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#FFFFFF', 'line-width': 3, 'line-opacity': 0.5, 'line-dasharray': [0, 4, 3] },
        });

        // ── Animated dash via requestAnimationFrame ──
        const dashSequence = [
          [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1],
          [2.5, 4, 0.5], [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3],
          [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
        ];
        let step = 0;
        let lastTime = 0;
        function animateDash(ts: number) {
          if (ts - lastTime > 80) {
            step = (step + 1) % dashSequence.length;
            try {
              if (map.getLayer('route-dash')) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                map.setPaintProperty('route-dash', 'line-dasharray', dashSequence[step] as any);
              }
            } catch { /* layer may have been removed */ }
            lastTime = ts;
          }
          navAnimFrameRef.current = requestAnimationFrame(animateDash);
        }
        if (navAnimFrameRef.current) cancelAnimationFrame(navAnimFrameRef.current);
        navAnimFrameRef.current = requestAnimationFrame(animateDash);

        const bounds = coords.reduce(
          (b: mapboxgl.LngLatBounds, c) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0]),
        );
        bounds.extend(destination);
        void bounds; // camera handled by flyToNavMode in handleGo
      } catch { /* ignore if map not ready */ }
    }, 200);
  }, [clearRoute]);

  // ── Facility selection ──
  const handleFacilitySelect = useCallback((facility: TriageFacility) => {
    const facilityDetails: FacilityDetails = {
      id: facility.id,
      name: facility.name,
      type: facility.type,
      address: facility.address,
      coordinates: facility.coordinates ?? [0, 0],
      waitTime: facility.waitTime,
      distance: facility.distance,
      phone: facility.phone,
      hours: "Open 24/7",
      locationId: facility.locationId,
      travelTimeMinutes: facility.travelTimeMinutes,
      totalTimeMinutes: facility.totalTimeMinutes,
    };
    
    setSelectedFacility(facilityDetails);

    // Telehealth and facilities without coordinates: no route or map movement
    if (facility.type === "telehealth" || !facility.coordinates) return;

    drawRoute(facility.coordinates);
  }, [drawRoute]);

  // ── GO: start navigation + notify facility ──
  const handleGo = useCallback(async (facility: FacilityDetails) => {
    // Immediately show loading overlay — user gets instant feedback
    setNavPhase('loading');
    // Clear ambulance markers immediately — they must not be visible during navigation
    ambulancesSetupRef.current = false;
    clearAmbulances();

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const [facilityLng, facilityLat] = facility.coordinates;
    const start: [number, number] = currentLocationRef.current ?? (() => {
      const c = mapRef.current?.getCenter();
      return c ? [c.lng, c.lat] : [-80.54, 43.47];
    })();

    const bearing = computeBearing(start, [facilityLng, facilityLat]);

    let etaMinutes = facility.travelTimeMinutes ?? 15;
    let distanceKm = parseFloat(facility.distance?.replace(/[^\d.]/g, "") ?? "5");
    let steps: NavigationStep[] = [];

    try {
      // driving-traffic = real traffic-aware routing (Mapbox Navigation API)
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start[0]},${start[1]};${facilityLng},${facilityLat}?geometries=geojson&steps=true&overview=full&annotations=duration,distance,congestion&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const navData = await res.json();
      if (navData.routes?.length > 0) {
        const route = navData.routes[0];
        etaMinutes = Math.round(route.duration / 60);
        distanceKm = Math.round(route.distance / 100) / 10;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        steps = (route.legs[0]?.steps ?? []).map((s: any) => ({
          instruction: s.maneuver.instruction as string,
          distanceMeters: s.distance as number,
          durationSeconds: s.duration as number,
          type: s.maneuver.type as string,
          modifier: s.maneuver.modifier as string | undefined,
        }));
        // Pass per-pair congestion annotations for color-coded route rendering
        const congestionPerPair: string[] = route.legs[0]?.annotation?.congestion ?? [];
        drawRouteFromGeometry(route.geometry, [facilityLng, facilityLat], congestionPerPair);
      } else {
        drawRoute(facility.coordinates);
      }
    } catch {
      drawRoute(facility.coordinates);
    }

    // ── Fly camera into navigation mode: street-level, pitched, bearing toward facility ──
    // Small delay so the route draw has a moment to kick off
    setTimeout(() => {
      mapRef.current?.flyTo({
        center: start,
        zoom: 16.5,
        pitch: 60,
        bearing,
        duration: 2200,
        essential: true,
      });
    }, 300);

    // ── Navigation puck: glowing directional arrow at user position ──
    if (navPuckRef.current) navPuckRef.current.remove();
    const puckEl = document.createElement('div');
    puckEl.innerHTML = `
      <div style="
        width:40px;height:40px;border-radius:50%;
        background:radial-gradient(circle,rgba(56,189,248,0.95) 0%,rgba(14,165,233,0.85) 60%,rgba(2,132,199,0.6) 100%);
        border:3px solid #FFFFFF;
        box-shadow:0 0 0 4px rgba(56,189,248,0.25),0 4px 16px rgba(56,189,248,0.55);
        display:flex;align-items:center;justify-content:center;
        transform:rotate(${bearing}deg);
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2 L19 20 L12 16 L5 20 Z"/>
        </svg>
      </div>
    `;
    navPuckRef.current = new mapboxgl.Marker({ element: puckEl, anchor: 'center' })
      .setLngLat(start)
      .addTo(mapRef.current!);

    // POST /incoming-patient
    let patientId: string | null = null;
    try {
      const symptomsArr = lastSymptoms
        ? lastSymptoms.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
        : ["symptoms not specified"];
      const res = await fetch(`${API_URL}/incoming-patient/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility_id: facility.locationId ?? 0,
          eta_minutes: etaMinutes,
          symptoms: symptomsArr,
          severity: userSeverity?.toString() ?? "3",
        }),
      });
      if (res.ok) {
        const d = await res.json();
        patientId = d.patient_id as string;
      }
    } catch { /* non-blocking */ }

    // Commit state
    setNavigationData({
      facilityName: facility.name,
      facilityAddress: facility.address,
      etaMinutes,
      distanceKm,
      steps,
      patientId,
      preArrivalSent: true,
      startCoords: start,
      initialBearing: bearing,
    });
    setSelectedFacility(null);
    setShowTriagePanel(false);

    // Show celebration if meaningful time was saved, otherwise go straight to nav
    if (triageResult?.timeSavedMinutes && triageResult.timeSavedMinutes > 15) {
      setNavPhase('celebrating');
    } else {
      setNavPhase('navigating');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawRoute, drawRouteFromGeometry, lastSymptoms, userSeverity, triageResult, clearAmbulances]);

  // ── Auto-dismiss celebration after 3.5 s ──
  useEffect(() => {
    if (navPhase !== 'celebrating') return;
    const t = setTimeout(() => setNavPhase('navigating'), 3500);
    return () => clearTimeout(t);
  }, [navPhase]);


  // ── Auto-enable traffic overlay when navigating ──
  useEffect(() => {
    if (navPhase === 'navigating' && navShowTraffic) {
      const t = setTimeout(enableNavTraffic, 800);
      return () => clearTimeout(t);
    } else if (navPhase === 'idle' && navAutoTrafficRef.current) {
      disableNavTraffic();
    }
  }, [navPhase, navShowTraffic, enableNavTraffic, disableNavTraffic]);

  // ── Isochrone reachability rings: 15 min (green) + 30 min (blue) from user ──
  useEffect(() => {
    if (!isochroneTarget || !mapReady || navPhase !== 'idle') return;
    const [iLng, iLat] = isochroneTarget;
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    const map = mapRef.current;
    if (!map || !MAPBOX_TOKEN) return;
    let cancelled = false;

    const clearIso = () => {
      ['isochrone-fill-1', 'isochrone-fill-0'].forEach(id => {
        try { if (map.getLayer(id)) map.removeLayer(id); } catch { /* */ }
      });
      try { if (map.getSource('isochrone')) map.removeSource('isochrone'); } catch { /* */ }
    };
    clearIso();

    fetch(
      `https://api.mapbox.com/isochrone/v1/mapbox/driving/${iLng},${iLat}?contours_minutes=15,30&polygons=true&denoise=1&generalize=500&access_token=${MAPBOX_TOKEN}`
    )
      .then(r => r.json())
      .then(data => {
        if (cancelled || !data.features?.length || !mapRef.current) return;
        const m = mapRef.current;
        if (m.getSource('isochrone')) return;
        m.addSource('isochrone', { type: 'geojson', data });
        // 30-min ring — faint sky-blue
        m.addLayer({
          id: 'isochrone-fill-1', type: 'fill', source: 'isochrone',
          filter: ['==', ['get', 'contour'], 30],
          paint: { 'fill-color': '#0EA5E9', 'fill-opacity': 0.06 },
        });
        // 15-min ring — soft emerald
        m.addLayer({
          id: 'isochrone-fill-0', type: 'fill', source: 'isochrone',
          filter: ['==', ['get', 'contour'], 15],
          paint: { 'fill-color': '#10B981', 'fill-opacity': 0.09 },
        });
      })
      .catch(() => { /* non-blocking */ });

    return () => {
      cancelled = true;
      clearIso();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isochroneTarget, mapReady, navPhase]);

  // ── Geocoding: search for a new starting location via Mapbox Geocoding API ──
  const handleLocationSearch = useCallback(async (query: string) => {
    setLocationQuery(query);
    if (query.length < 3) { setGeocodeResults([]); return; }
    const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    const center = mapRef.current?.getCenter();
    const prox = center ? `${center.lng},${center.lat}` : '-80.54,43.47';
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=CA&types=place,address,neighborhood,locality&proximity=${prox}&limit=5&access_token=${TOKEN}`
      );
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setGeocodeResults((data.features ?? []).map((f: any) => ({
        id: f.id as string,
        placeName: f.place_name as string,
        center: f.center as [number, number],
      })));
    } catch { setGeocodeResults([]); }
  }, []);

  const handleLocationSelect = useCallback((center: [number, number]) => {
    currentLocationRef.current = center;
    setShowLocationSearch(false);
    setLocationQuery('');
    setGeocodeResults([]);
    mapRef.current?.flyTo({ center, zoom: 13, duration: 1500 });
    if (currentLocationMarkerRef.current) currentLocationMarkerRef.current.setLngLat(center);
    // Re-fetch care options for the new location
    fetchCareOptions(center[1], center[0], userSeverity);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCareOptions, userSeverity]);

  // ── Fetch real Mapbox travel time when a facility is selected ──
  useEffect(() => {
    if (!selectedFacility?.coordinates || selectedFacility.type === 'telehealth') return;
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (!MAPBOX_TOKEN) return;
    const [endLng, endLat] = selectedFacility.coordinates;
    const start: [number, number] = currentLocationRef.current ?? (() => {
      const c = mapRef.current?.getCenter();
      return c ? [c.lng, c.lat] : [-80.54, 43.47];
    })();
    const fid = selectedFacility.id;
    let cancelled = false;
    fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${endLng},${endLat}?geometries=geojson&overview=none&access_token=${MAPBOX_TOKEN}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled || !data.routes?.length) return;
        const r0 = data.routes[0];
        const realMin = Math.round(r0.duration / 60);
        const realKm  = Math.round(r0.distance / 100) / 10;
        setSelectedFacility(prev => prev?.id !== fid ? prev : {
          ...prev,
          travelTimeMinutes: realMin,
          distance: `${realKm.toFixed(1)} km`,
          totalTimeMinutes: prev.totalTimeMinutes != null
            ? realMin + Math.max(0, (prev.totalTimeMinutes - (prev.travelTimeMinutes ?? realMin)))
            : undefined,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFacility?.id]);

  // ── Add red markers for suggested facilities ──
  const addFacilityMarkers = useCallback((facilities: TriageFacility[]) => {
    if (!mapRef.current) return;

    clearMarkers();

    facilities.forEach((facility) => {
      if (!facility.coordinates) return; // skip virtual/telehealth facilities
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
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
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

      // Telehealth services are virtual — no map markers
      const mappable = filteredFacilities.filter(f => f.type !== "telehealth" && f.coordinates);

      // Wait for map to be fully loaded and idle
      const addMarkers = () => {
        if (mapRef.current && mapRef.current.loaded()) {
          addFacilityMarkers(mappable);
          // Auto-select first non-telehealth facility when results load or filter changes
          const shouldAutoSelect = pendingAutoSelectRef.current || autoSelectFirstRef.current;
          if (shouldAutoSelect && filteredFacilities.length > 0 && !isNavigating) {
            pendingAutoSelectRef.current = false;
            autoSelectFirstRef.current = false;
            const firstSelectable = filteredFacilities.find(f => f.type !== "telehealth" && f.coordinates);
            if (firstSelectable) handleFacilitySelect(firstSelectable);
          }
        } else {
          setTimeout(addMarkers, 100);
        }
      };
      
      const timeoutId = setTimeout(addMarkers, 200);
      return () => { clearTimeout(timeoutId); };
    }
  }, [triageResult, mapReady, activeFilter, addFacilityMarkers, handleFacilitySelect, isNavigating]);

  // ── Ambulance overlay — severity 4 or 5 only, hidden during navigation ─────
  useEffect(() => {
    const isUrgent = userSeverity != null && userSeverity >= 4;
    // Hide ambulances during any navigation phase — they interfere with the nav puck and route
    if (mapReady && flowStep === "map" && triageResult && isUrgent && !isNavigating) {
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
  }, [mapReady, flowStep, triageResult, userSeverity, isNavigating, addAmbulanceMarkers, clearAmbulances]);

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

        // GPS has resolved — reposition ambulances around the real location.
        // Clear the position cache so addAmbulanceMarkers recomputes at GPS coords.
        // Wait for flyTo to finish (1200 ms) before respawning.
        if (ambulancesSetupRef.current) {
          ambulancePosRef.current = null;   // discard map-center positions
          ambulancesSetupRef.current = false;
          clearAmbulances();
          setTimeout(() => {
            addAmbulanceMarkers();
            ambulancesSetupRef.current = true;
          }, 1400);
        } else {
          // Ambulances not yet visible — just redraw route if selected pos is known
          if (selectedAmbulancePosRef.current) {
            setTimeout(() => drawAmbulanceRoute(selectedAmbulancePosRef.current!), 300);
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, drawAmbulanceRoute, addAmbulanceMarkers, clearAmbulances]);

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
      // 🕐 Auto light: night 8 pm–6 am, dusk 5–8 pm, day otherwise
      const h = new Date().getHours();
      const autoPreset = (h >= 20 || h < 6) ? 'night' as const : h >= 17 ? 'dusk' as const : 'day' as const;
      map.setConfigProperty("basemap", "lightPreset", autoPreset);
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
      {showToolbar && flowStep === "map" && !!triageResult && !isNavigating && (
        <Toolbar activeFilter={activeFilter} onFilterChange={handleFilterChange} />
      )}

      {mapReady && navPhase === 'idle' && <MapControls map={mapRef.current} />}

      {/* ── Location Search (Mapbox Geocoding API) ── */}
      {flowStep === 'map' && navPhase === 'idle' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
          {!showLocationSearch ? (
            <button
              onClick={() => setShowLocationSearch(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-white/[0.10] text-white/40 hover:text-white/70 text-[11px] font-medium transition-all duration-200"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Change location
            </button>
          ) : (
            <div className="glass rounded-2xl p-3 w-72 border border-white/[0.14] flex flex-col gap-2 shadow-2xl animate-fadeIn">
              <div className="flex items-center gap-2.5 px-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-sky-400 shrink-0">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <input
                  autoFocus
                  value={locationQuery}
                  onChange={e => handleLocationSearch(e.target.value)}
                  placeholder="Search city or address in Canada…"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30 min-w-0"
                />
                <button
                  onClick={() => { setShowLocationSearch(false); setLocationQuery(''); setGeocodeResults([]); }}
                  className="text-white/30 hover:text-white/70 transition-colors shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
              {geocodeResults.length > 0 && (
                <div className="flex flex-col divide-y divide-white/[0.05]">
                  {geocodeResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleLocationSelect(r.center)}
                      className="text-left px-2 py-2.5 text-white/65 hover:text-white hover:bg-white/[0.06] text-xs leading-snug transition-colors rounded-lg"
                    >
                      {r.placeName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Triage Results Panel (Left) ── */}
      {triageResult && showTriagePanel && navPhase === 'idle' && (() => {
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
      {triageResult && !showTriagePanel && flowStep === "map" && navPhase === 'idle' && (
        <button
          onClick={() => setShowTriagePanel(true)}
          className="absolute top-16 left-4 z-20 flex items-center gap-2.5 glass rounded-2xl px-5 py-3 text-white hover:text-white transition-all duration-200 animate-slideUp hover:scale-105 shadow-lg border border-white/[0.15]"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          <span className="text-sm font-semibold">{triageResult.facilities.length} facilities nearby</span>
        </button>
      )}

      {/* ── Facility Details Panel (Right) ── */}
      {selectedFacility && navPhase === 'idle' && (
        <FacilityDetailsPanel
          facility={selectedFacility}
          onClose={() => {
            setSelectedFacility(null);
            clearRoute();
          }}
          accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""}
          showReportButton={true}
          onShowEvidence={(snap) => setEvidenceModalData({ facilityName: selectedFacility.name, snapshot: snap })}
          onGo={() => handleGo(selectedFacility)}
          onShowRoute={() => {
            const report = createReport(selectedFacility);
            setReportPreview(report);
          }}
        />
      )}

      {/* ── Loading overlay: shown immediately when GO is pressed ── */}
      {navPhase === 'loading' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-md animate-fadeIn">
          <div className="glass rounded-3xl px-8 py-9 flex flex-col items-center gap-5 max-w-xs w-full mx-6 border border-white/[0.10]">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <Navigation2 size={28} className="text-sky-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center">
                <div className="w-3.5 h-3.5 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-white font-bold text-lg leading-tight">Getting your route</div>
              <div className="text-white/40 text-sm mt-1.5">
                Notifying {selectedFacility?.name ?? 'facility'}…
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Celebration overlay: time saved WOW moment ── */}
      {navPhase === 'celebrating' && navigationData && triageResult?.timeSavedMinutes && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer animate-fadeIn"
          onClick={() => setNavPhase('navigating')}
        >
          <div className="flex flex-col items-center gap-6 max-w-sm w-full mx-6 text-center">
            {/* Big time saved */}
            <div className="glass rounded-3xl px-10 py-9 w-full border border-emerald-500/20 bg-emerald-500/[0.06]">
              <div className="text-[9px] uppercase tracking-[0.35em] font-bold text-emerald-400/60 mb-4">
                vs nearest ER
              </div>
              <div className="text-7xl font-bold text-emerald-300 tabular-nums leading-none animate-timeSavedReveal">
                {formatMinutes(triageResult.timeSavedMinutes)}
              </div>
              <div className="text-white/40 text-base mt-3 font-semibold">saved</div>
            </div>

            {/* Destination info */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="text-white font-bold text-xl">{navigationData.facilityName}</div>
              <div className="text-white/35 text-sm">
                {formatMinutes(navigationData.etaMinutes)} away · {navigationData.distanceKm.toFixed(1)} km
              </div>
              {navigationData.patientId && (
                <div className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-emerald-300/80 text-xs font-semibold">Facility notified</span>
                  <span className="text-emerald-400/40 text-[10px] font-mono">{navigationData.patientId}</span>
                </div>
              )}
            </div>

            <div className="text-white/20 text-xs">tap anywhere to start navigation →</div>
          </div>
        </div>
      )}

      {/* ── Navigation Panel (full-screen overlay) ── */}
      {navPhase === 'navigating' && navigationData && (
        <NavigationPanel
          data={navigationData}
          onStop={() => {
            setNavPhase('idle');
            setNavigationData(null);
            clearRoute();
            // Remove nav puck
            if (navPuckRef.current) { navPuckRef.current.remove(); navPuckRef.current = null; }
            // Stop dash animation
            if (navAnimFrameRef.current) { cancelAnimationFrame(navAnimFrameRef.current); navAnimFrameRef.current = null; }
            // Restore overview camera
            mapRef.current?.easeTo({ pitch: 45, bearing: 0, zoom: 13, duration: 1000 });
          }}
          onRecenter={handleNavRecenter}
          onOverview={handleNavOverview}
          showTraffic={navShowTraffic}
          onToggleTraffic={handleNavToggleTraffic}
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
            setShowTriagePanel(true);
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
