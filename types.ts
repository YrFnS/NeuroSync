
export type AIProvider = 'openrouter' | 'gemini';

export enum AppMode {
  OFFLINE = 'OFFLINE', // New fallback mode
  IDLE = 'IDLE',
  NAVIGATION = 'NAVIGATION',
  READING = 'READING',
  SCANNING = 'SCANNING',
  DANGER = 'DANGER',
  GUARDIAN = 'GUARDIAN' // The "Help" mode
}

export type VisualFilter = 'NONE' | 'HIGH_CONTRAST' | 'INVERTED' | 'ACHROMATOPSIA';

export interface NavigationData {
  direction: 'STRAIGHT' | 'LEFT' | 'RIGHT' | 'STOP' | 'CROSSWALK';
  distance: string; // e.g. "5m"
  hazard?: string;
}

export interface ReadingData {
  text: string;
  summary?: string;
}

export interface ScanningData {
  objectName: string;
  details: string;
}

export interface EmergencyPlan {
  safeExitRoute: string;
  nearestLandmark: string;
  hazardSummary: string;
  recommendedAction: string;
}

export interface EnvironmentalEvent {
  id: string;
  timestamp: number;
  type: 'OBJECT_SEEN' | 'HAZARD_DETECTED' | 'LOCATION_CHANGE';
  description: string;
  coordinates?: { lat: number; lng: number };
  snapshot?: string; // Base64 image string of the event
}

export interface GuardianData {
  active: boolean;
  location?: { lat: number; lng: number };
  locationHistory: Array<{ lat: number; lng: number }>; // Breadcrumbs
  transcript: string[];
  eventLog: EnvironmentalEvent[];
  plan?: EmergencyPlan;
}

export interface DetectedObject {
    class: string;
    score: number;
    bbox: number[]; // [x, y, width, height]
}

export interface NeuroState {
  mode: AppMode;
  visualFilter: VisualFilter;
  navData?: NavigationData;
  readData?: ReadingData;
  scanData?: ScanningData;
  guardianData: GuardianData;
  isAudioStreaming: boolean;
  offlineDetections?: DetectedObject[]; // New field for local detections
}

export type ActionType = 
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'UPDATE_NAV'; payload: NavigationData }
  | { type: 'UPDATE_READ'; payload: ReadingData }
  | { type: 'UPDATE_SCAN'; payload: ScanningData }
  | { type: 'TRIGGER_DANGER'; payload: string }
  | { type: 'ACTIVATE_GUARDIAN' }
  | { type: 'UPDATE_PLAN'; payload: EmergencyPlan }
  | { type: 'ADD_TRANSCRIPT'; payload: string }
  | { type: 'LOG_EVENT'; payload: Omit<EnvironmentalEvent, 'id' | 'timestamp'> }
  | { type: 'LOAD_HISTORY'; payload: EnvironmentalEvent[] }
  | { type: 'UPDATE_LOCATION'; payload: { lat: number; lng: number } }
  | { type: 'SET_STREAMING'; payload: boolean }
  | { type: 'UPDATE_OFFLINE_DETECTIONS'; payload: DetectedObject[] }
  | { type: 'CYCLE_FILTER' };
