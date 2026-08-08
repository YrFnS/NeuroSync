
import type React from 'react';
import { AlertOctagon } from 'lucide-react';
import { AppMode, type NeuroState, type ActionType, type AIProvider } from '../types';
import { LiquidDisplay } from './LiquidDisplay';
import { BatteryWarning } from './BatteryWarning';
import { DebugMenu } from './DebugMenu';
import { StatusHeader } from './StatusHeader';
import { GestureLayer } from './GestureLayer';
import { soundEngine } from '../utils/soundEngine';

interface Props {
    state: NeuroState;
    dispatch: React.Dispatch<ActionType>;
    
    // Sensor Data
    cameraStream: MediaStream | null;
    batteryLevel: number;
    isLowBattery: boolean;
    
    // AI Connection
    isConnected: boolean;
    error: string | null;
    onToggleConnection: () => void;
    
    // UI State
    provider: AIProvider;
    setProvider: (provider: AIProvider) => void;
    geminiApiKey: string;
    setGeminiApiKey: (key: string) => void;
    openRouterApiKey: string;
    setOpenRouterApiKey: (key: string) => void;
    openRouterModelId: string;
    setOpenRouterModelId: (modelId: string) => void;
    showDebug: boolean;
    setShowDebug: (val: boolean) => void;
    privacyMode: boolean;
    setPrivacyMode: (val: boolean) => void;
    isLightTheme: boolean;
    toggleTheme: () => void;
}

export const NeuroInterface: React.FC<Props> = ({
    state,
    dispatch,
    cameraStream,
    batteryLevel,
    isLowBattery,
    isConnected,
    error,
    onToggleConnection,
    provider,
    setProvider,
    geminiApiKey,
    setGeminiApiKey,
    openRouterApiKey,
    setOpenRouterApiKey,
    openRouterModelId,
    setOpenRouterModelId,
    showDebug,
    setShowDebug,
    privacyMode,
    setPrivacyMode,
    isLightTheme,
    toggleTheme
}) => {

    const handleSingleTap = () => {
        if (isConnected) {
            soundEngine.speakSystem(`System Active. Mode: ${state.mode}. Battery ${Math.round(batteryLevel * 100)} percent.`);
        } else {
            soundEngine.speakSystem("Offline Safe Mode. Double tap to connect.");
        }
    };

    const handleTripleTap = () => {
        soundEngine.repeatLast();
    };

    const handleGuardianTrigger = () => {
        if (state.mode !== AppMode.GUARDIAN) {
            dispatch({ type: 'ACTIVATE_GUARDIAN' });
            soundEngine.speakSystem("Emergency Guardian Mode Activated.");
        }
    };

    const handleFilterCycle = () => {
        soundEngine.playFilterSwitch();
        dispatch({ type: 'CYCLE_FILTER' });
    };

    return (
        <div className={`h-[100dvh] w-screen overflow-hidden flex flex-col font-sans relative transition-colors duration-300 ${isLightTheme ? 'theme-light bg-neuro-bg text-neuro-text' : 'bg-black text-white'}`}>
            
            <GestureLayer 
                onDoubleTap={onToggleConnection}
                onTripleTap={handleTripleTap}
                onLongPress={handleGuardianTrigger}
                onSingleTap={handleSingleTap}
                onSwipeLeft={handleFilterCycle}
                onSwipeRight={handleFilterCycle}
                isConnected={isConnected}
                privacyMode={privacyMode}
                setPrivacyMode={setPrivacyMode}
            />

            <StatusHeader 
                mode={state.mode}
                isConnected={isConnected}
                privacyMode={privacyMode}
                onActivateGuardian={() => dispatch({ type: 'ACTIVATE_GUARDIAN' })}
            />

            {error && (
                <div className="absolute top-32 left-4 right-4 z-[60] bg-[#FF4D00] text-white p-4 rounded-xl border-4 border-white flex items-center gap-4 animate-bounce" role="alert">
                    <AlertOctagon size={48} strokeWidth={3} />
                    <div>
                    <h2 className="text-2xl font-black uppercase">System Error</h2>
                    <p className="font-bold">{error}</p>
                    </div>
                </div>
            )}
            
            {isLowBattery && <BatteryWarning level={batteryLevel} />}

            <main className="flex-1 relative z-0 h-full w-full bg-neuro-bg" role="main" aria-live="polite">
                <LiquidDisplay 
                    state={state} 
                    videoStream={cameraStream} 
                    onExitGuardian={() => dispatch({ type: 'SET_MODE', payload: isConnected ? AppMode.IDLE : AppMode.OFFLINE })}
                />
            </main>

            {/* Floating Hints */}
            {state.mode !== AppMode.GUARDIAN && !isConnected && !privacyMode && state.mode !== AppMode.OFFLINE && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[40] flex flex-col items-center justify-center w-full pointer-events-none opacity-50">
                    <div className="animate-bounce mb-2 text-center">
                        <p className="font-bold uppercase tracking-widest text-sm">Double Tap Screen</p>
                        <p className="text-xs opacity-70">to Connect</p>
                    </div>
                </div>
            )}
            
            {isConnected && !privacyMode && state.mode !== AppMode.GUARDIAN && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[40] pointer-events-none">
                    <div className="w-16 h-1 bg-[#FFD600] rounded-full shadow-[0_0_10px_#FFD600] animate-pulse"></div>
                </div>
            )}

            <DebugMenu 
                show={showDebug}
                onClose={() => setShowDebug(false)}
                onToggleDebug={() => setShowDebug(!showDebug)}
                dispatch={dispatch}
                provider={provider}
                setProvider={setProvider}
                geminiApiKey={geminiApiKey}
                setGeminiApiKey={setGeminiApiKey}
                openRouterApiKey={openRouterApiKey}
                setOpenRouterApiKey={setOpenRouterApiKey}
                openRouterModelId={openRouterModelId}
                setOpenRouterModelId={setOpenRouterModelId}
                isLightTheme={isLightTheme}
                toggleTheme={toggleTheme}
            />
        </div>
    );
}
