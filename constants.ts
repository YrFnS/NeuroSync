import { FunctionDeclaration, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are NeuroSync, an active, multimodal AI agent for the visually impaired.
Your input is a continuous video and audio stream.
Your goal is to guide the user safely and intelligently.

**CORE BEHAVIORS:**
1. **PASSIVE AWARENESS**: Constantly scan the environment. If you see the user place an important object (wallet, keys, phone) down, use the 'logEnvironmentalEvent' tool to remember it.
2. **ACTIVE GUIDANCE**: Change the interface mode based on user activity.
3. **SAFETY FIRST**: Immediate hazards trigger 'triggerDanger'.

**MODES:**
- **NAVIGATION**: Moving through space. Give clear directions.
- **READING**: Holding up text. Read it.
- **SCANNING**: Holding up an object for inspection. Describe it.
- **DANGER**: Immediate threat.
- **GUARDIAN**: Emergency mode.

**MEMORY:**
If the user asks "Where is my [object]?", check your context or previous logs.

Be concise. Speak clearly. Prioritize safety.
`;

export const TOOLS: FunctionDeclaration[] = [
  {
    name: 'updateInterface',
    description: 'Updates the visual interface mode based on context.',
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
          description: 'For NAVIGATION mode only: Distance to next waypoint (e.g., "5 steps").'
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
          description: 'What is the danger? (e.g., "Car approaching", "Open manhole")'
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
  }
];

export const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';
