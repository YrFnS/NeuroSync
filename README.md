# NeuroSync

> "The world is designed for sight. We are giving it a voice."

**NeuroSync** is an active, multimodal AI agent designed specifically for the 285 million visually impaired people worldwide. Unlike traditional accessibility tools that are reactive (wait for a photo click), NeuroSync uses the **Gemini Multimodal Live API** to process continuous video and audio streams, proactively understanding context and adapting the interface in real-time.

---

## 🚀 Core Features

### 1. The "Live Guide" (Continuous Vision)
NeuroSync moves beyond "Describe this image." It processes a video stream via WebRTC.
*   **Passive Awareness**: As the user walks, the AI whispers concise cues: "Doorway on your right," "Crowd ahead," or "Stairs descending."
*   **Spatial Understanding**: Uses Gemini's multimodal reasoning to understand depth and movement, not just static object recognition.

### 2. Adaptive "Liquid" Interface
The UI is not static. It physically transforms based on environmental context to maximize utility for low-vision users.

*   **Navigation Mode (High-Contrast Navigation)**
    *   **Trigger**: Detecting walking or movement.
    *   **UI**: Massive, high-contrast directional arrows (Safety Yellow on Void Black).
    *   **Audio**: "Sonar" engine – a Geiger-counter style clicking that speeds up as you approach a waypoint.
*   **Reader Mode (Instant OCR)**
    *   **Trigger**: Holding up a menu, sign, or document.
    *   **UI**: Switches to high-contrast white-on-black text.
    *   **Behavior**: Instantly extracts and summarizes text (e.g., reading a café menu price list).
*   **Scanning Mode (Object Detail)**
    *   **Trigger**: Holding an object for inspection.
    *   **UI**: Thick, bold viewfinder reticle.
    *   **Behavior**: Identifies specific details (e.g., "Campbell's Soup, Tomato Flavor, 10oz").

### 3. "Danger Sense" (Haptic Safety)
Safety is the priority. Latency kills.
*   **Hazard Detection**: Identifies immediate threats (cars backing up, open manholes).
*   **Feedback Loop**: Bypasses the text-to-speech engine to trigger an immediate **Haptic Vibration** (SOS pattern) and a visual strobe effect (Black/Signal Orange) to halt the user instantly.

### 4. Semantic Memory ("The Key Finder")
NeuroSync remembers what it sees.
*   **The Feature**: The user can ask, *"Gemini, where did I leave my wallet?"*
*   **The Tech**: The AI queries its session memory (Vector Store logic) and replies: *"I saw you place the wallet on the kitchen counter 10 minutes ago."*

### 5. Guardian Link (SOS Dashboard)
A safety net for when AI isn't enough.
*   **Trigger**: User says "Help" or taps the panic button.
*   **The Dashboard**: Generates a shareable URL for a trusted contact.
*   **Live Data**: The contact sees a real-time map (Leaflet), a transcript of what the AI is telling the user, and a log of detected hazards.

---

## 🎨 Accessibility Design Philosophy ("Hyper-Legible Industrial")

We rejected standard "Cyberpunk" or "Modern Clean" aesthetics in favor of **WCAG 2.1 AAA** compliance and functional brutality.

1.  **Typography**: **Atkinson Hyperlegible**. Developed by the Braille Institute, this font focuses on letterform distinction to increase character recognition for low-vision readers.
2.  **Color Palette**:
    *   **Void Black (`#000000`)**: Maximizes contrast on OLED screens and reduces glare/photophobia.
    *   **Safety Yellow (`#FFD600`)**: The most visible color to the human eye, used for primary actions.
    *   **Signal Orange (`#FF4D00`)**: Reserved exclusively for STOP/DANGER signals.
3.  **Haptics & Audio**:
    *   **Synthetic Audio Engine**: Custom Web Audio API implementation generates zero-latency interface sounds (clicks, hums, alarms) without relying on slow external MP3 assets.
    *   **Edge Anchoring**: Buttons are anchored to screen corners, allowing users to find controls by feeling the physical edge of their device.

---

## 🛠 Technical Stack

*   **Frontend**: React 19, Tailwind CSS.
*   **AI Model**: Google Gemini 2.5 Flash (Multimodal Live API) via WebSockets.
*   **Audio**: Native Web Audio API (Oscillators/GainNodes) for synthesizer-based feedback.
*   **Maps**: Leaflet.js with Dark Mode tiles.
*   **State Management**: React `useReducer` for complex multimodal state transitions.

## 📦 Setup

1.  Clone the repository.
2.  Create a `.env` file with your Gemini API Key:
    ```
    API_KEY=your_google_genai_api_key
    ```
3.  Run the development server.
    ```bash
    npm install
    npm start
    ```
4.  Open in a browser (Chrome/Edge recommended for WebRTC support).

---

*NeuroSync is a concept application demonstrating the power of multimodal AI agents in assistive technology.*
