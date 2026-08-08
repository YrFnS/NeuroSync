import type React from "react";
import { Settings, Sun, Moon } from "lucide-react";
import { AppMode, type ActionType, type AIProvider } from "../types";
import { soundEngine } from "../utils/soundEngine";
import { OpenRouterSettings } from "./OpenRouterSettings";

interface Props {
	show: boolean;
	onClose: () => void;
	dispatch: React.Dispatch<ActionType>;
	provider: AIProvider;
	setProvider: (provider: AIProvider) => void;
	geminiApiKey: string;
	setGeminiApiKey: (key: string) => void;
	openRouterApiKey: string;
	setOpenRouterApiKey: (key: string) => void;
	openRouterModelId: string;
	setOpenRouterModelId: (modelId: string) => void;
	isLightTheme: boolean;
	toggleTheme: () => void;
	onToggleDebug: () => void;
}

export const DebugMenu: React.FC<Props> = ({
	show,
	onClose,
	dispatch,
	provider,
	setProvider,
	geminiApiKey,
	setGeminiApiKey,
	openRouterApiKey,
	setOpenRouterApiKey,
	openRouterModelId,
	setOpenRouterModelId,
	isLightTheme,
	toggleTheme,
	onToggleDebug,
}) => {
	if (!show) {
		return (
			<div className="fixed top-32 right-4 z-[60]">
				<button
					onClick={onToggleDebug}
					className="pointer-events-auto rounded-full border-2 border-gray-700 bg-neuro-ui p-3 text-gray-500 backdrop-blur-sm hover:text-neuro-text"
					aria-label="Open AI Settings"
				>
					<Settings size={24} strokeWidth={3} />
				</button>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
			<div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl border-4 border-black bg-white p-4 text-sm font-bold text-black shadow-2xl">
				<div className="mb-4 flex items-center justify-between border-b-4 border-black pb-2">
					<h3 className="text-xl uppercase">AI Settings &amp; Simulator</h3>
					<button onClick={onClose} className="rounded bg-black p-2 text-white">Close</button>
				</div>

				<label className="block" htmlFor="ai-provider">AI provider</label>
				<select
					id="ai-provider"
					value={provider}
					onChange={(event) => setProvider(event.target.value as AIProvider)}
					className="mb-4 w-full rounded border-2 border-black bg-white p-2"
				>
					<option value="openrouter">OpenRouter BYOK</option>
					<option value="gemini">Gemini Live BYOK</option>
				</select>

				<div className="mb-6 flex items-center justify-between rounded border-2 border-black bg-gray-100 p-3">
					<div className="flex items-center gap-2">
						{isLightTheme ? <Sun size={20} /> : <Moon size={20} />}
						<span>Theme: {isLightTheme ? "Light" : "Dark"}</span>
					</div>
					<button
						onClick={() => {
							toggleTheme();
							soundEngine.playModeSwitch();
						}}
						className="rounded bg-black px-3 py-1 text-xs uppercase text-white"
					>
						Toggle
					</button>
				</div>

				<div className="mb-4 grid grid-cols-2 gap-3">
					<button onClick={() => dispatch({ type: "UPDATE_NAV", payload: { direction: "STRAIGHT", distance: "10m" } })} className="rounded border-2 border-black bg-gray-200 p-3 font-bold hover:bg-yellow-300">Fwd</button>
					<button onClick={() => dispatch({ type: "UPDATE_NAV", payload: { direction: "LEFT", distance: "Turn" } })} className="rounded border-2 border-black bg-gray-200 p-3 font-bold hover:bg-yellow-300">Left</button>
					<button onClick={() => dispatch({ type: "UPDATE_READ", payload: { text: "Latte $4.00" } })} className="rounded border-2 border-black bg-gray-200 p-3 font-bold hover:bg-yellow-300">Read</button>
					<button onClick={() => dispatch({ type: "UPDATE_SCAN", payload: { objectName: "Soup Can", details: "Tomato" } })} className="rounded border-2 border-black bg-gray-200 p-3 font-bold hover:bg-yellow-300">Scan</button>
					<button onClick={() => dispatch({ type: "TRIGGER_DANGER", payload: "Car Backing Up!" })} className="col-span-2 rounded border-2 border-black bg-[#FF4D00] p-3 font-black uppercase text-white">! Danger !</button>
				</div>

				{provider === "openrouter" ? (
					<OpenRouterSettings
						apiKey={openRouterApiKey}
						setApiKey={setOpenRouterApiKey}
						modelId={openRouterModelId}
						setModelId={setOpenRouterModelId}
						onResponse={(text) => {
							dispatch({ type: "ADD_TRANSCRIPT", payload: `AI: ${text}` });
							soundEngine.speakSystem(text);
						}}
					/>
				) : (
					<section className="border-t-4 border-black pt-3" aria-labelledby="gemini-heading">
						<h4 id="gemini-heading" className="text-lg uppercase">Gemini Live BYOK</h4>
						<p className="mt-1 text-xs font-normal">The key remains in this browser&apos;s local storage and is used only for the direct Gemini Live connection.</p>
						<label className="mt-3 block" htmlFor="gemini-key">Gemini API key</label>
						<div className="flex gap-2">
							<input
								id="gemini-key"
								type="password"
								value={geminiApiKey}
								onChange={(event) => setGeminiApiKey(event.target.value)}
								autoComplete="off"
								spellCheck={false}
								className="min-w-0 flex-1 rounded border-2 border-black bg-gray-100 p-3 font-mono text-black"
							/>
							<button type="button" onClick={() => setGeminiApiKey("")} className="rounded border-2 border-black px-3">Clear key</button>
						</div>
					</section>
				)}
			</div>
		</div>
	);
};
