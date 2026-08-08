export const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
export const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

const STORAGE_KEY = "NEURO_OPENROUTER_KEY";
const STORAGE_MODEL = "NEURO_OPENROUTER_MODEL";

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const cleanText = (value) => typeof value === "string" ? value.trim() : "";

export function parseModelCatalog(payload) {
	if (!isRecord(payload) || !Array.isArray(payload.data)) {
		throw new Error("OpenRouter returned an invalid model catalog.");
	}

	const models = [];
	const ids = new Set();
	for (const entry of payload.data) {
		if (!isRecord(entry)) continue;
		const id = cleanText(entry.id);
		if (!id || ids.has(id)) continue;
		ids.add(id);

		const pricing = isRecord(entry.pricing) ? entry.pricing : {};
		const contextLength = Number(entry.context_length);
		models.push({
			id,
			name: cleanText(entry.name) || id,
			contextLength: Number.isFinite(contextLength) && contextLength > 0 ? contextLength : null,
			pricing: {
				prompt: cleanText(pricing.prompt) || null,
				completion: cleanText(pricing.completion) || null,
			},
		});
	}

	if (models.length === 0) {
		throw new Error("OpenRouter returned no usable models. Enter a model ID manually.");
	}
	return models;
}

export function isFreeModel(model) {
	if (model?.pricing?.prompt == null || model?.pricing?.completion == null) return false;
	const prompt = Number(model.pricing.prompt);
	const completion = Number(model.pricing.completion);
	return Number.isFinite(prompt) && Number.isFinite(completion) && prompt === 0 && completion === 0;
}

export function searchModels(models, query = "", freeOnly = false) {
	const needle = cleanText(query).toLocaleLowerCase();
	return models.filter((model) => {
		if (freeOnly && !isFreeModel(model)) return false;
		return !needle || model.id.toLocaleLowerCase().includes(needle) || model.name.toLocaleLowerCase().includes(needle);
	});
}

export function findSelectedModel(models, selectedModelId) {
	return models.find((model) => model.id === selectedModelId) || null;
}

export function readOpenRouterSettings(storage = globalThis.localStorage) {
	try {
		return {
			apiKey: storage?.getItem(STORAGE_KEY) || "",
			modelId: storage?.getItem(STORAGE_MODEL) || "",
		};
	} catch {
		return { apiKey: "", modelId: "" };
	}
}

export function writeOpenRouterSettings({ apiKey, modelId }, storage = globalThis.localStorage) {
	try {
		if (apiKey) storage?.setItem(STORAGE_KEY, apiKey);
		else storage?.removeItem(STORAGE_KEY);
		if (modelId) storage?.setItem(STORAGE_MODEL, modelId);
		else storage?.removeItem(STORAGE_MODEL);
	} catch {
		// Browser privacy modes can disable storage; the in-memory settings still work.
	}
}

export function clearOpenRouterSettings(storage = globalThis.localStorage) {
	try {
		storage?.removeItem(STORAGE_KEY);
		storage?.removeItem(STORAGE_MODEL);
	} catch {
		// Clearing in-memory state still removes access for the current page.
	}
}

export function redactOpenRouterError(error, apiKey = "") {
	let message = error instanceof Error ? error.message : "OpenRouter request failed.";
	for (const secret of new Set([apiKey, apiKey.trim()])) {
		if (secret) message = message.split(secret).join("[redacted]");
	}
	return message.slice(0, 300);
}

export async function fetchOpenRouterModels({ fetchImpl = fetch, force = false } = {}) {
	let response;
	try {
		response = await fetchImpl(OPENROUTER_MODELS_URL, {
			method: "GET",
			headers: { Accept: "application/json" },
			cache: force ? "reload" : "default",
		});
	} catch {
		throw new Error("Could not reach OpenRouter model discovery. Enter a model ID manually.");
	}
	if (!response.ok) {
		throw new Error(`OpenRouter model discovery failed (HTTP ${response.status}). Enter a model ID manually.`);
	}
	let payload;
	try {
		payload = await response.json();
	} catch {
		throw new Error("OpenRouter returned an invalid model catalog. Enter a model ID manually.");
	}
	return parseModelCatalog(payload);
}

export function createOpenRouterRequest({ apiKey, modelId, prompt }) {
	const key = cleanText(apiKey);
	const model = cleanText(modelId);
	const content = cleanText(prompt);
	if (!key) throw new Error("Enter your OpenRouter API key in settings.");
	if (!model) throw new Error("Select a model or enter its exact OpenRouter model ID.");
	if (!content) throw new Error("Enter a message for OpenRouter.");

	return {
		url: OPENROUTER_CHAT_URL,
		init: {
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model,
				messages: [{ role: "user", content }],
			}),
		},
	};
}

export async function openRouterChat({ apiKey, modelId, prompt, fetchImpl = fetch }) {
	const request = createOpenRouterRequest({ apiKey, modelId, prompt });
	let response;
	try {
		response = await fetchImpl(request.url, request.init);
	} catch {
		throw new Error("Could not reach OpenRouter. Check your connection and try again.");
	}

	if (!response.ok) {
		if (response.status === 401 || response.status === 403) {
			throw new Error("OpenRouter rejected the browser-local key. Check or replace it in settings.");
		}
		if (response.status === 429) {
			throw new Error("OpenRouter rate limit reached. Wait or select another model.");
		}
		throw new Error(`OpenRouter request failed (HTTP ${response.status}). Try again or select another model.`);
	}

	let payload;
	try {
		payload = await response.json();
	} catch {
		throw new Error("OpenRouter returned unreadable JSON. Try again or select another model.");
	}
	const content = payload?.choices?.[0]?.message?.content;
	if (typeof content !== "string" || !content.trim()) {
		throw new Error("OpenRouter returned no usable message. Try again or select another model.");
	}
	return content.trim();
}
