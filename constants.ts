import { FunctionDeclaration, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are NeuroSync, an active, multimodal AI agent for the visually impaired.
Your input is a continuous video and audio stream. 
Your goal is to be a hyper-fast, "Liquid Interface" that adapts to the user's context instantly.

**CORE BEHAVIORS & SENSITIVITY TUNING:**

1.  **PASSIVE AWARENESS (IDLE MODE - The Default):**
    *   **Behavior:** Continuously scan the environment. Whisper concise cues ("Doorway right", "Crowd ahead").
    *   **Sensitivity:** Remain in IDLE if the user is stationary, shifting weight, or just looking around. Do NOT switch to NAVIGATION unless there is clear forward movement.

2.  **ACTIVE NAVIGATION (WALKING MODE):**
    *   **Trigger Condition:** ONLY when the user is actively walking with intent for > 2 seconds.
    *   **Action:** Call \`updateInterface({ mode: 'NAVIGATION' })\`.
    *   **Behavior:** Provide clock-face directions ("12 o'clock", "2 o'clock") and distances.
    *   **Sensitivity:** If the user stops, pause navigation updates. If they stop for > 5 seconds, call \`updateInterface({ mode: 'IDLE' })\`.

3.  **DANGER INTERVENTION (CRITICAL SAFETY):**
    *   **Trigger Condition:** IMMEDIATE physical threat on a collision course or a fall hazard.
    *   **Specific Triggers:**
        *   Cars moving *towards* the user (ignore parallel traffic).
        *   Open manholes, construction pits, or platform edges (subway/train).
        *   Head-height obstacles (signs, branches).
        *   Fast-moving objects (bikes, scooters) intersecting the user's path.
    *   **Action:** IMMEDIATELY call \`triggerDanger\`.
    *   **Sensitivity:** HIGH for moving threats. LOW for static obstacles (just navigate around them). Do not trigger DANGER for a closed door or a wall; just give directions.

4.  **CONTEXTUAL MODES (READING & SCANNING):**
    *   **READING:** Trigger when text is held steadily in front of the camera.
    *   **SCANNING:** Trigger when an object is held up for inspection.

5.  **SEMANTIC MEMORY:**
    *   If you see the user place an important item (keys, wallet, phone, glasses), silently call \`logEnvironmentalEvent\`.

**VOICE STYLE:**
*   Robotic, precise, high WPM. 
*   Format: "[Object] [Direction] [Distance]."
*   Example: "Bench 2 o'clock, 5 meters."

**NAVIGATION OUTPUT RULES:**
*   Directions: "STRAIGHT", "LEFT", "RIGHT", "STOP", "CROSSWALK".
`;

export const TOOLS: FunctionDeclaration[] = [
  {
    name: 'updateInterface',
    description: 'Updates the visual interface mode based on environmental context.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        mode: {
          type: Type.STRING,
          enum: ['NAVIGATION', 'READING', 'SCANNING', 'IDLE'],
          description: 'The mode to switch the interface to.'
        },
        direction: {
          type: Type.STRING,
          enum: ['STRAIGHT', 'LEFT', 'RIGHT', 'STOP', 'CROSSWALK'],
          description: 'For NAVIGATION mode only: The direction to go.'
        },
        distance: {
          type: Type.STRING,
          description: 'For NAVIGATION mode only: Distance to next waypoint (e.g., "5m").'
        },
        extractedText: {
          type: Type.STRING,
          description: 'For READING mode only: The text found in the image.'
        },
        objectDescription: {
          type: Type.STRING,
          description: 'For SCANNING mode only: Short description of the object.'
        }
      },
      required: ['mode']
    }
  },
  {
    name: 'triggerDanger',
    description: 'Triggers the haptic danger alarm for immediate hazards.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        hazardDescription: {
          type: Type.STRING,
          description: 'The specific danger (e.g., "Car approaching", "Open manhole")'
        }
      },
      required: ['hazardDescription']
    }
  },
  {
    name: 'activateGuardian',
    description: 'Activates the emergency companion dashboard. Use this when the user says "Help".',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  },
  {
    name: 'provideEmergencyPlan',
    description: 'Generates a tactical emergency plan for the Guardian Dashboard. Call this immediately after activating Guardian mode.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        safeExitRoute: {
          type: Type.STRING,
          description: 'Clear, step-by-step instructions to the nearest exit or safe zone.'
        },
        nearestLandmark: {
          type: Type.STRING,
          description: 'The most visible nearby object to use as an anchor.'
        },
        hazardSummary: {
          type: Type.STRING,
          description: 'A concise list of immediate threats in the area.'
        },
        recommendedAction: {
          type: Type.STRING,
          description: 'The single most important action the user (or helper) should take.'
        }
      },
      required: ['safeExitRoute', 'nearestLandmark', 'hazardSummary', 'recommendedAction']
    }
  },
  {
    name: 'logEnvironmentalEvent',
    description: 'Logs a significant event or object location to memory (The Key Finder).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: ['OBJECT_SEEN', 'HAZARD_DETECTED', 'LOCATION_CHANGE'],
          description: 'The type of event.'
        },
        description: {
          type: Type.STRING,
          description: 'Description of the event (e.g., "User placed wallet on kitchen counter").'
        }
      },
      required: ['type', 'description']
    }
  },
  {
    name: 'queryMemory',
    description: 'Retrieves past events from memory to answer user questions about object locations.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'The object or event to search for (e.g., "wallet", "keys").'
        }
      },
      required: ['query']
    }
  }
];

export const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';