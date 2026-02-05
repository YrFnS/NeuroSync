import { FunctionDeclaration, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are NeuroSync, an active, multimodal AI agent for the visually impaired.
Your input is a continuous video and audio stream. 
Your goal is to be a hyper-fast, "Liquid Interface" that adapts to the user's context instantly.

**CORE BEHAVIORS:**

1.  **PASSIVE AWARENESS (The Whisper):**
    *   Continuously scan the video feed.
    *   Whisper concise, spatial cues *only* when necessary.
    *   Examples: "Doorway right.", "Crowd ahead.", "Stairs down.", "Clear path."
    *   Do NOT be chatty. Speed is safety.

2.  **ACTIVE STATE CONTROL (The Liquid UI):**
    *   **WALKING:** If the user is moving/walking, IMMEDIATELY call \`updateInterface({ mode: 'NAVIGATION' })\`. Provide clock-face directions.
    *   **READING:** If the user holds up text/sign/menu, IMMEDIATELY call \`updateInterface({ mode: 'READING' })\` and read it.
    *   **SCANNING:** If the user holds an object for inspection, IMMEDIATELY call \`updateInterface({ mode: 'SCANNING' })\`.
    *   **DANGER:** If you see a hazard (car, hole, obstacle), IMMEDIATELY call \`triggerDanger\`.

3.  **SEMANTIC MEMORY:**
    *   If you see the user place an important item (keys, wallet, phone, glasses), silently call \`logEnvironmentalEvent\`.
    *   Example: "User put keys on the coffee table."

4.  **EMERGENCY PROTOCOL:**
    *   If the user says "Help" or triggers Guardian Mode, analyze the scene for exits and call \`provideEmergencyPlan\`.

**VOICE STYLE:**
*   Robotic but warm. High wpm (words per minute).
*   No filler words ("I see...", "It looks like...").
*   Format: "[Object] at [Clock Position], [Distance]."

**NAVIGATION RULES:**
*   Use "STRAIGHT", "LEFT", "RIGHT", "STOP".
*   If a crosswalk is safe, set direction to "CROSSWALK".
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