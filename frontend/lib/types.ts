// ── Shared TypeScript interfaces ──

/** Urgency level assigned by triage */
export type UrgencyLevel = "emergency" | "urgent" | "standard" | "self-care" | "low" | "medium" | "high";

/** Care facility filter categories */
export type CareFilter =
    | "all"
    | "er"
    | "urgent"
    | "walkin"
    | "telehealth"
    | "pharmacy"
    | "specialty";

/** Result from the triage/diagnosis process */
export interface TriageResult {
    urgency: UrgencyLevel;
    careType: string;
    summary: string;
    facilities: TriageFacility[];
    /** Minutes saved vs going to the nearest ER instead */
    timeSavedMinutes?: number | null;
    /** Total time at the nearest ER (travel + wait), for comparison */
    nearestErTotalMinutes?: number | null;
  backboardReport?: any;
}

/** A healthcare facility returned by triage */
export interface TriageFacility {
    id: string;
    name: string;
    type: string;
    distance: string;
    waitTime?: string;
    address: string;
    coordinates?: [number, number];
    careAccessTime?: number;
    /** Backend DB location ID — present when facility comes from /care-options */
    locationId?: number;
    travelTimeMinutes?: number;
    totalTimeMinutes?: number;
    phone?: string;
    website?: string;
}

/** Detailed info for a selected facility */
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
    /** Backend DB location ID — present when the facility is a known seeded location */
    locationId?: number;
    travelTimeMinutes?: number;
    totalTimeMinutes?: number;
}

/** A single turn-by-turn navigation instruction from Mapbox Directions */
export interface NavigationStep {
    instruction: string;
    distanceMeters: number;
    durationSeconds: number;
    type?: string;
    modifier?: string;
}

/** State for the active navigation session */
export interface NavigationData {
    facilityName: string;
    facilityAddress: string;
    etaMinutes: number;
    distanceKm: number;
    steps: NavigationStep[];
    patientId: string | null;
    preArrivalSent: boolean;
    /** Starting coords — used to position the nav camera */
    startCoords?: [number, number];
    /** Compass bearing toward facility at nav start */
    initialBearing?: number;
}

// ── Wait Time Evidence Types ──────────────────────────────────────────────────

export interface WaitTimeScenario {
    scenario_code: string;
    label: string;
    wait_minutes: number | null;
    wait_min_minutes: number | null;
    wait_max_minutes: number | null;
    target_minutes: number;
    probability_within_target: number;
    confidence_score: number;
    notes: string | null;
}

export interface WaitTimeSourceRecord {
    source_kind: string;
    source_name: string;
    status: string;
    confidence_score: number;
    freshness_minutes: number;
    reported_at: string;
    wait_minutes: number | null;
    wait_min_minutes: number | null;
    wait_max_minutes: number | null;
    metadata_json: string | null;
}

export interface WaitTimeLocationSummary {
    id: number;
    name: string;
    type: string;
    city: string;
    latitude: number;
    longitude: number;
}

export interface WaitTimeSnapshot {
    id: number;
    care_location_id: number;
    source_kind: string;
    source_name: string;
    status: string;
    confidence_score: number;
    confidence_label: string;
    overall_wait_minutes: number | null;
    overall_wait_min_minutes: number | null;
    overall_wait_max_minutes: number | null;
    capacity_score: number;
    queue_length: number;
    occupancy_probability: number;
    diversion_probability: number;
    last_reported_at: string;
    created_at: string;
    scenarios: WaitTimeScenario[];
    source_records: WaitTimeSourceRecord[];
    care_location: WaitTimeLocationSummary | null;
}

/** Popup result displayed after a search/triage */
export interface TriagePopupResult {
    urgency: UrgencyLevel;
    careType: string;
    answer: string;
    coordinates?: [number, number] | null;
    should_fly_to: boolean;
    zoom_level?: number | null;
}

/** Questionnaire answer data */
export interface QuestionnaireData {
    category: string | null;
    otherCategory?: string;
    severity: number | null;
    duration: string | null;
    symptoms?: string;
}

/** Medical report for facility submission */
export interface MedicalReport {
    patientInfo: {
        timestamp: string;
    };
    assessment: {
        category: string;
        severity: number;
        severityLabel: string;
        duration: string;
        symptoms: string;
        urgencyLevel: UrgencyLevel;
        urgencyLabel: string;
    };
    recommendation: {
        careType: string;
        summary: string;
    };
    selectedFacility: {
        id: string;
        name: string;
        type: string;
        address: string;
    };
}

// ── /care-options API response types ─────────────────────────────────────────

/** Single facility returned by GET /care-options */
export interface CareOption {
    facility_id: number;
    name: string;
    type: string;
    address: string;
    phone?: string;
    latitude: number;
    longitude: number;
    distance_km: number;
    travel_time_minutes: number;
    wait_time_minutes: number | null;
    wait_time_range: [number | null, number | null];
    total_time_minutes: number | null;
    recommendation_score: number;
    confidence_score: number;
    confidence_label: string;
    source_kind: string;
    status: string;
    snapshot: WaitTimeSnapshot | null;
}

export interface CareOptionsResponse {
    generated_at: string;
    user_location: { lat: number; lng: number };
    count: number;
    facilities: CareOption[];
}
