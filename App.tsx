import type React from "react";
import { useState, useEffect } from "react";
import { AppMode, type AIProvider } from "./types";
import { useNeuroState } from "./hooks/useNeuroState";
import { useAudioFeedback } from "./hooks/useAudioFeedback";
import { useNeuroSensors } from "./hooks/useNeuroSensors";
import { useGeminiIntegration } from "./hooks/useGeminiIntegration";
import { NeuroInterface } from "./components/NeuroInterface";
import { soundEngine } from "./utils/soundEngine";
import { readOpenRouterSettings, writeOpenRouterSettings } from "./utils/openRouter";

const App: React.FC = () => {
	// --- STATE CORE ---
	const { state, dispatch, stateRef } = useNeuroState();

	// --- UI STATE ---
	// Provider credentials are user-supplied at runtime and never bundled at build time.
	const [geminiApiKey, setGeminiApiKey] = useState(
		() => localStorage.getItem("NEURO_API_KEY") || "",
	);
	const [openRouterApiKey, setOpenRouterApiKey] = useState(
		() => readOpenRouterSettings().apiKey,
	);
	const [openRouterModelId, setOpenRouterModelId] = useState(
		() => readOpenRouterSettings().modelId,
	);
	const [provider, setProvider] = useState<AIProvider>(() => {
		const stored = localStorage.getItem("NEURO_AI_PROVIDER");
		if (stored === "openrouter" || stored === "gemini") return stored;
		return localStorage.getItem("NEURO_API_KEY") ? "gemini" : "openrouter";
	});
	const [showDebug, setShowDebug] = useState(false);
	const [privacyMode, setPrivacyMode] = useState(false);
	const [isLightTheme, setIsLightTheme] = useState(false);

	// Sync browser-local provider settings.
	useEffect(() => {
		if (geminiApiKey) localStorage.setItem("NEURO_API_KEY", geminiApiKey);
		else localStorage.removeItem("NEURO_API_KEY");
	}, [geminiApiKey]);
	useEffect(() => {
		writeOpenRouterSettings({ apiKey: openRouterApiKey, modelId: openRouterModelId });
	}, [openRouterApiKey, openRouterModelId]);
	useEffect(() => {
		localStorage.setItem("NEURO_AI_PROVIDER", provider);
	}, [provider]);

	// --- AUDIO FEEDBACK ---
	useAudioFeedback(state);

	// --- AUDIO CONTEXT UNLOCKER ---
	// Critical for Mobile Safari/Chrome: Resumes AudioContext on first physical interaction
	useEffect(() => {
		const unlockAudio = () => {
			soundEngine.init();
			soundEngine.getContext()?.resume();
			// Remove listeners once unlocked
			document.removeEventListener("touchstart", unlockAudio);
			document.removeEventListener("click", unlockAudio);
		};
		document.addEventListener("touchstart", unlockAudio);
		document.addEventListener("click", unlockAudio);
		return () => {
			document.removeEventListener("touchstart", unlockAudio);
			document.removeEventListener("click", unlockAudio);
		};
	}, []);

	// --- THEME ---
	useEffect(() => {
		const metaThemeColor = document.querySelector('meta[name="theme-color"]');
		if (metaThemeColor) {
			metaThemeColor.setAttribute(
				"content",
				isLightTheme ? "#FFFFFF" : "#000000",
			);
		}
	}, [isLightTheme]);

	// --- SENSORS & SIDE EFFECTS ---
	const sensors = useNeuroSensors(
		state,
		dispatch,
		state.mode !== AppMode.OFFLINE,
		showDebug,
	);

	// --- GEMINI AI INTEGRATION ---
	const {
		connect,
		disconnect,
		isConnected,
		error: sessionError,
	} = useGeminiIntegration(
		state,
		dispatch,
		stateRef,
		geminiApiKey,
		sensors.location,
		sensors.cameraStream,
	);

	const totalError = provider === "gemini" ? sessionError || sensors.cameraError : null;

	useEffect(() => {
		if (provider === "openrouter" && isConnected) {
			disconnect();
			dispatch({ type: "SET_MODE", payload: AppMode.OFFLINE });
		}
	}, [provider, isConnected, disconnect, dispatch]);

	// --- STARTUP LOGIC ---
	useEffect(() => {
		if (state.mode === AppMode.IDLE && !isConnected) {
			dispatch({ type: "SET_MODE", payload: AppMode.OFFLINE });
		}
		const timer = setTimeout(() => {
			soundEngine.speakSystem(
				"NeuroSync Online. Double tap for AI settings. Swipe down with two fingers for privacy curtain.",
			);
		}, 1000);
		return () => clearTimeout(timer);
	}, []);

	// --- ERROR FEEDBACK ---
	useEffect(() => {
		if (totalError) soundEngine.speakSystem(`System Error: ${totalError}`);
	}, [totalError]);

	// --- CONNECTION TOGGLER ---
	const toggleConnection = () => {
		if (provider === "openrouter") {
			setShowDebug(true);
			if (!openRouterApiKey) soundEngine.speakSystem("OpenRouter key missing. Enter it in settings.");
			else if (!openRouterModelId) soundEngine.speakSystem("Select an OpenRouter model in settings.");
			else soundEngine.speakSystem("OpenRouter ready. Enter a message in settings.");
			return;
		}
		if (isConnected) {
			soundEngine.speakSystem("Disconnecting. Engaging Offline Cortex.");
			disconnect();
			dispatch({ type: "SET_MODE", payload: AppMode.OFFLINE });
		} else {
			if (!geminiApiKey) {
				soundEngine.speakSystem("Error. Gemini API key missing.");
				alert("Please set a Gemini API key in settings.");
				setShowDebug(true); // Auto-open debug menu
				return;
			}
			soundEngine.speakSystem("Connecting to Gemini Live.");
			soundEngine.playModeSwitch();
			dispatch({ type: "SET_MODE", payload: AppMode.IDLE });
			connect();
		}
	};

	return (
		<NeuroInterface
			state={state}
			dispatch={dispatch}
			cameraStream={sensors.cameraStream}
			batteryLevel={sensors.batteryLevel}
			isLowBattery={sensors.isLowBattery}
			isConnected={isConnected}
			error={totalError}
			onToggleConnection={toggleConnection}
			provider={provider}
			setProvider={setProvider}
			geminiApiKey={geminiApiKey}
			setGeminiApiKey={setGeminiApiKey}
			openRouterApiKey={openRouterApiKey}
			setOpenRouterApiKey={setOpenRouterApiKey}
			openRouterModelId={openRouterModelId}
			setOpenRouterModelId={setOpenRouterModelId}
			showDebug={showDebug}
			setShowDebug={setShowDebug}
			privacyMode={privacyMode}
			setPrivacyMode={setPrivacyMode}
			isLightTheme={isLightTheme}
			toggleTheme={() => setIsLightTheme(!isLightTheme)}
		/>
	);
};

export default App;
