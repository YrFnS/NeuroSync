import { useCallback, useEffect, type Dispatch } from "react";
import { AppMode, type NeuroState, type ActionType } from "../types";
import { useGeolocation } from "./useGeolocation";
import { useBattery } from "./useBattery";
import { useCamera } from "./useCamera";
import { useOfflineVision } from "./useOfflineVision";
import { useFallDetection } from "./useFallDetection";
import { useShake } from "./useShake";
import { soundEngine } from "../utils/soundEngine";

export const useNeuroSensors = (
	state: NeuroState,
	dispatch: Dispatch<ActionType>,
	isConnected: boolean,
	showDebug: boolean,
) => {
	// 1. Geolocation
	const { location } = useGeolocation();

	// Sync Location to State
	useEffect(() => {
		if (location) dispatch({ type: "UPDATE_LOCATION", payload: location });
	}, [location, dispatch]);

	// 2. Battery
	const {
		level: batteryLevel,
		charging: isCharging,
		supported: batterySupported,
	} = useBattery();
	const isLowBattery = batterySupported && !isCharging && batteryLevel <= 0.2;

	// 3. Camera (Shared Stream)
	const { stream: cameraStream, error: cameraError } = useCamera();

	// 4. Offline Vision (TensorFlow)
	useOfflineVision({
		stream: cameraStream,
		isOffline: state.mode === AppMode.OFFLINE,
		onDetections: (objects) => {
			dispatch({ type: "UPDATE_OFFLINE_DETECTIONS", payload: objects });
		},
	});

	// 5. Fall Detection (The Sentinel)
	const handleFallDetected = useCallback(() => {
		if (state.mode === AppMode.DANGER || state.mode === AppMode.GUARDIAN)
			return;

		console.warn("FALL DETECTED - TRIGGERING GUARDIAN");
		soundEngine.playDangerAlarm();
		soundEngine.speakSystem(
			"Fall Detected. Initiating Guardian Emergency Protocol.",
		);

		setTimeout(() => {
			dispatch({ type: "ACTIVATE_GUARDIAN" });
			dispatch({
				type: "LOG_EVENT",
				payload: {
					type: "HAZARD_DETECTED",
					description: "Automatic Fall Detection Triggered",
				},
			});
		}, 1000);
	}, [state.mode, dispatch]);

	useFallDetection(handleFallDetected, !showDebug);

	// 6. Shake to Reset
	useShake(15, () => {
		if (
			state.mode !== AppMode.IDLE &&
			state.mode !== AppMode.GUARDIAN &&
			state.mode !== AppMode.OFFLINE
		) {
			soundEngine.playReset();
			soundEngine.speakSystem("Resetting interface.");
			if (navigator.vibrate) navigator.vibrate(200);
			dispatch({
				type: "SET_MODE",
				payload: isConnected ? AppMode.IDLE : AppMode.OFFLINE,
			});
		}
	});

	return {
		location,
		batteryLevel,
		isCharging,
		isLowBattery,
		cameraStream,
		cameraError,
	};
};
