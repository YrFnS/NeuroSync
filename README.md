# NeuroSync

> "The world is designed for sight. We are giving it a voice."

**NeuroSync** is an active, multimodal AI agent designed specifically for the 285 million visually impaired people worldwide. Unlike traditional accessibility tools that are reactive (wait for a photo click), NeuroSync supports browser-local BYOK access to **Gemini Multimodal Live** for continuous video/audio and **OpenRouter** for user-selected chat models.

---

## 🚀 Core Features

### 1. The "Live Guide" (Continuous Vision)

NeuroSync moves beyond "Describe this image." It processes a video stream via WebRTC.

* **Passive Awareness**: As the user walks, the AI whispers concise cues: "Doorway on your right," "Crowd ahead," or "Stairs descending."
* **Spatial Understanding**: Uses Gemini's multimodal reasoning to understand depth and movement, not just static object recognition.

### 2. Adaptive "Liquid" Interface

The UI is not static. It physically transforms based on environmental context to maximize utility for low-vision users.

* **Navigation Mode (High-Contrast Navigation)**
  * **Trigger**: Detecting walking or movement.
  * **UI**: Massive, high-contrast directional arrows (Safety Yellow on Void Black).
  * **Audio**: "Sonar" engine – a Geiger-counter style clicking that speeds up as you approach a waypoint.
* **Reader Mode (Instant OCR)**
  * **Trigger**: Holding up a menu, sign, or document.
  * **UI**: Switches to high-contrast white-on-black text.
  * **Behavior**: Instantly extracts and summarizes text (e.g., reading a café menu price list).
* **Scanning Mode (Object Detail)**
  * **Trigger**: Holding an object for inspection.
  * **UI**: Thick, bold viewfinder reticle.
  * **Behavior**: Identifies specific details (e.g., "Campbell's Soup, Tomato Flavor, 10oz").

### 3. "Danger Sense" (Haptic Safety)

Safety is the priority. Latency kills.

* **Hazard Detection**: Identifies immediate threats (cars backing up, open manholes).
* **Feedback Loop**: Bypasses the text-to-speech engine to trigger an immediate **Haptic Vibration** (SOS pattern) and a visual strobe effect (Black/Signal Orange) to halt the user instantly.

### 4. Semantic Memory ("The Key Finder")

NeuroSync remembers what it sees.

* **The Feature**: The user can ask, *"Gemini, where did I leave my wallet?"*
* **The Tech**: The AI queries its session memory (Vector Store logic) and replies: *"I saw you place the wallet on the kitchen counter 10 minutes ago."*

### 5. Guardian Link (SOS Dashboard)

A safety net for when AI isn't enough.

* **Trigger**: User says "Help" or taps the panic button.
* **The Dashboard**: Generates a shareable URL for a trusted contact.
* **Live Data**: The contact sees a real-time map (Leaflet), a transcript of what the AI is telling the user, and a log of detected hazards.

---

## 🕹️ Gestures & Controls

Since the user may not see the screen, the entire app is controlled via a **Gesture Layer**:

* **Double Tap Screen**: Open OpenRouter AI settings or connect/disconnect Gemini Live.
* **Shake Device**: RESET interface (Emergency exit from any mode to IDLE).
* **Two-Finger Swipe Down**: Toggle Privacy Curtain (Blacks out screen for privacy while keeping AI active).
* **Long Press (1.2s)**: Trigger SOS / Guardian Mode.
* **Single Tap**: Hear Status Report (Battery Level + Current Mode).

---

## 🛠 Technical Stack

* **Frontend**: React 19, Tailwind CSS.
* **AI Providers**: Browser-local BYOK for Gemini Live multimodal sessions or user-selected OpenRouter chat models.
* **Audio**: Native Web Audio API (Oscillators/GainNodes) for synthesizer-based feedback with Audio Ducking.
* **Maps**: Leaflet.js with Dark Mode tiles.
* **State Management**: React `useReducer` for complex multimodal state transitions.

## 📦 Setup

1. Clone the repository.
2. Install dependencies:

    ```bash
    npm install
    ```

3. **AI Configuration**:
    * Tap the Settings/Gear icon and choose OpenRouter BYOK or Gemini Live BYOK.
    * OpenRouter loads its live model catalog; search it and explicitly select a model, or enter an exact model ID manually.
    * Provider credentials remain only in browser storage and are never bundled during deployment.
4. Run the development server:

    ```bash
    npm run dev
    ```

5. Open in a browser (Chrome/Edge recommended for WebRTC support).

---

*NeuroSync is a concept application demonstrating the power of multimodal AI agents in assistive technology.*
