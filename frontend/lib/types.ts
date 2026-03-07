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
    careAccessTime?: number;
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
