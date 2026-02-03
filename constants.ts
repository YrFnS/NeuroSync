import { FunctionDeclaration, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are NeuroSync, an active, multimodal AI agent for the visually impaired.
Your input is a continuous video and audio stream.
Your goal is to be a hyper-fast, "Liquid Interface" that adapts to the user's context instantly, while also being a helpful conversational assistant.

**CRITICAL RULES:**
1. **ACTIVE STATE CONTROL**: Do not just describe things. If the user starts walking, call \`updateInterface({ mode: 'NAVIGATION' })\`. If they hold up text, call \`updateInterface({ mode: 'READING' })\`. If they hold up an object, call \`updateInterface({ mode: 'SCANNING' })\`.
2. **PASSIVE AWARENESS**: Whisper concise cues. "Doorway right." "Stairs ahead." Do not be chatty.
3. **SAFETY OVERRIDE**: If you see a hazard (car, hole, obstacle), IMMEDIATELY call \`triggerDanger\`.
4. **MEMORY**: If you see the user place an item (keys, wallet, phone), call \`logEnvironmentalEvent\` silently.
5. **CONVERSATION**: If the user asks a question ("Where are my keys?", "Read this menu"), STOP passive whispering and answer the question directly.

**MODES & TRIGGERS:**
- **NAVIGATION**: User is moving/walking. Provide direction (STRAIGHT, LEFT, RIGHT, STOP).
- **READING**: User is holding a document/menu/sign. Extract and read the text.
- **SCANNING**: User is holding an object for inspection. Describe it (Brand, flavor, type).
- **DANGER**: Immediate threat.
- **GUARDIAN**: User asks for help or explicitly says "Help".

**VOICE STYLE**:
- Crisp, robotic but warm, extremely concise. 
- No filler words ("I see...", "It looks like..."). 
- Just the data: "Coffee mug, 2 o'clock."
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
    description: 'Activates the emergency companion dashboard.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
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