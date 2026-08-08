import { useEffect, useMemo, useState, type FormEvent } from "react";
import { RefreshCw, Search, Trash2 } from "lucide-react";
import {
	fetchOpenRouterModels,
	findSelectedModel,
	openRouterChat,
	redactOpenRouterError,
	searchModels,
} from "../utils/openRouter";

interface Props {
	apiKey: string;
	setApiKey: (key: string) => void;
	modelId: string;
	setModelId: (modelId: string) => void;
	onResponse: (text: string) => void;
}

export const OpenRouterSettings = ({
	apiKey,
	setApiKey,
	modelId,
	setModelId,
	onResponse,
}: Props) => {
	const [models, setModels] = useState<any[]>([]);
	const [search, setSearch] = useState("");
	const [freeOnly, setFreeOnly] = useState(false);
	const [catalogStatus, setCatalogStatus] = useState("Loading live models…");
	const [catalogError, setCatalogError] = useState("");
	const [prompt, setPrompt] = useState("");
	const [response, setResponse] = useState("");
	const [actionError, setActionError] = useState("");
	const [sending, setSending] = useState(false);

	const loadModels = async (force = false) => {
		setCatalogError("");
		setCatalogStatus(force ? "Refreshing live models…" : "Loading live models…");
		try {
			const catalog = await fetchOpenRouterModels({ force });
			setModels(catalog);
			setCatalogStatus(`${catalog.length} live models available`);
		} catch (error) {
			setModels([]);
			setCatalogStatus("Model discovery unavailable");
			setCatalogError(redactOpenRouterError(error));
		}
	};

	useEffect(() => {
		void loadModels();
	}, []);

	const visibleModels = useMemo(
		() => searchModels(models, search, freeOnly),
		[models, search, freeOnly],
	);
	const selectedModel = findSelectedModel(models, modelId);

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		setActionError("");
		setResponse("");
		setSending(true);
		try {
			const text = await openRouterChat({ apiKey, modelId, prompt });
			setResponse(text);
			onResponse(text);
		} catch (error) {
			setActionError(redactOpenRouterError(error, apiKey));
		} finally {
			setSending(false);
		}
	};

	return (
		<section className="mt-4 border-t-4 border-black pt-4" aria-labelledby="openrouter-heading">
			<h4 id="openrouter-heading" className="text-lg uppercase">OpenRouter BYOK</h4>
			<p className="mt-1 text-xs font-normal">
				Your key remains in this browser&apos;s local storage and is sent only as an Authorization Bearer header to OpenRouter.
			</p>

			<label className="mt-3 block" htmlFor="openrouter-key">OpenRouter API key</label>
			<div className="flex gap-2">
				<input
					id="openrouter-key"
					type="password"
					value={apiKey}
					onChange={(event) => setApiKey(event.target.value)}
					autoComplete="off"
					spellCheck={false}
					className="min-w-0 flex-1 rounded border-2 border-black bg-gray-100 p-2 font-mono text-black"
				/>
				<button
					type="button"
					onClick={() => setApiKey("")}
					className="flex items-center gap-1 rounded border-2 border-black px-3"
				>
					<Trash2 size={16} /> Clear key
				</button>
			</div>

			<div className="mt-4 flex items-end gap-2">
				<label className="min-w-0 flex-1" htmlFor="openrouter-search">
					<span className="flex items-center gap-1"><Search size={14} /> Search models</span>
					<input
						id="openrouter-search"
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						className="mt-1 w-full rounded border-2 border-black bg-gray-100 p-2 text-black"
					/>
				</label>
				<button
					type="button"
					onClick={() => void loadModels(true)}
					className="flex items-center gap-1 rounded border-2 border-black px-3 py-2"
				>
					<RefreshCw size={16} /> Refresh
				</button>
			</div>

			<label className="mt-2 flex items-center gap-2 font-normal">
				<input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />
				Free only (derived from live prompt and completion pricing)
			</label>
			<p className="mt-2 text-xs" role="status">{catalogStatus}</p>
			{catalogError && <p className="mt-1 text-xs text-red-700" role="alert">{catalogError}</p>}

			<label className="mt-3 block" htmlFor="openrouter-models">Live model picker</label>
			<select
				id="openrouter-models"
				size={6}
				value={modelId}
				onChange={(event) => setModelId(event.target.value)}
				className="w-full rounded border-2 border-black bg-white p-2 font-mono text-xs text-black"
			>
				<option value="" disabled>Choose a model explicitly</option>
				{visibleModels.map((model) => (
					<option key={model.id} value={model.id}>{model.name} — {model.id}</option>
				))}
			</select>
			{visibleModels.length === 0 && <p className="mt-1 text-xs font-normal">No discovered models match. Enter an exact model ID below.</p>}

			<label className="mt-3 block" htmlFor="openrouter-model-id">Selected or manual model ID</label>
			<input
				id="openrouter-model-id"
				type="text"
				value={modelId}
				onChange={(event) => setModelId(event.target.value)}
				placeholder="Exact OpenRouter model ID"
				spellCheck={false}
				className="w-full rounded border-2 border-black bg-gray-100 p-2 font-mono text-black"
			/>
			{selectedModel && (
				<div className="mt-2 rounded bg-gray-100 p-2 text-xs font-normal" aria-label="Selected model metadata">
					<p><strong>{selectedModel.name}</strong></p>
					<p className="break-all">{selectedModel.id}</p>
					<p>Context: {selectedModel.contextLength?.toLocaleString() || "not provided"}</p>
					<p>Pricing/token — prompt: {selectedModel.pricing.prompt ?? "not provided"}; completion: {selectedModel.pricing.completion ?? "not provided"}</p>
				</div>
			)}

			<form onSubmit={submit} className="mt-4 border-t-2 border-black pt-3">
				<label className="block" htmlFor="openrouter-prompt">Ask the selected model</label>
				<textarea
					id="openrouter-prompt"
					value={prompt}
					onChange={(event) => setPrompt(event.target.value)}
					rows={3}
					className="w-full rounded border-2 border-black bg-gray-100 p-2 font-normal text-black"
				/>
				<button
					type="submit"
					disabled={sending}
					className="mt-2 w-full rounded bg-black p-3 text-white disabled:opacity-50"
				>
					{sending ? "Sending…" : "Ask OpenRouter"}
				</button>
			</form>
			{actionError && <p className="mt-2 text-sm text-red-700" role="alert">{actionError}</p>}
			{response && <div className="mt-2 whitespace-pre-wrap rounded bg-emerald-100 p-3 font-normal" role="status">{response}</div>}
		</section>
	);
};
