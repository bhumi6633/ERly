// ── Shared TypeScript interfaces ──

/** Urgency level assigned by triage */
export type UrgencyLevel = "emergency" | "urgent" | "standard" | "self-care";

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
}

/** A healthcare facility returned by triage */
export interface TriageFacility {
    id: string;
    name: string;
    type: string;
    distance: string;
    waitTime?: string;
    address: string;
    coordinates: [number, number];
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
    severity: number | null;
    duration: string | null;
}
