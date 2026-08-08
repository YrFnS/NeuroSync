import assert from "node:assert/strict";
import {
	OPENROUTER_CHAT_URL,
	clearOpenRouterSettings,
	createOpenRouterRequest,
	findSelectedModel,
	isFreeModel,
	openRouterChat,
	parseModelCatalog,
	readOpenRouterSettings,
	redactOpenRouterError,
	searchModels,
	writeOpenRouterSettings,
} from "../utils/openRouter.js";

const parseJson = (value) => {
	try {
		return JSON.parse(value);
	} catch (error) {
		assert.fail(`Expected valid JSON: ${error}`);
	}
};

const catalog = parseModelCatalog({
	data: [
		{
			id: "vendor/alpha",
			name: "Alpha Vision",
			context_length: 32000,
			pricing: { prompt: "0.000001", completion: "0.000002" },
		},
		{
			id: "vendor/beta:free",
			name: "Beta Free",
			context_length: 64000,
			pricing: { prompt: "0", completion: "0" },
		},
		{ id: "vendor/beta:free", name: "Duplicate" },
		{ name: "Missing ID" },
	],
});

assert.equal(catalog.length, 2);
assert.equal(searchModels(catalog, "vision")[0].id, "vendor/alpha");
assert.deepEqual(searchModels(catalog, "", true).map(({ id }) => id), ["vendor/beta:free"]);
assert.equal(isFreeModel(catalog[0]), false);
assert.equal(isFreeModel(catalog[1]), true);
assert.equal(isFreeModel({ pricing: { prompt: null, completion: null } }), false);
assert.equal(findSelectedModel(catalog, "vendor/alpha")?.contextLength, 32000);
assert.equal(findSelectedModel(catalog, "Vendor/alpha"), null, "selection must use the exact model ID");
assert.throws(() => parseModelCatalog({ data: [{ name: "bad" }] }), /no usable models/i);

const values = new Map();
const storage = {
	getItem: (key) => values.get(key) ?? null,
	setItem: (key, value) => values.set(key, value),
	removeItem: (key) => values.delete(key),
};
const dummyKey = "not-a-real-openrouter-credential";
writeOpenRouterSettings({ apiKey: dummyKey, modelId: "vendor/alpha" }, storage);
assert.deepEqual(readOpenRouterSettings(storage), { apiKey: dummyKey, modelId: "vendor/alpha" });
const redacted = redactOpenRouterError(new Error(`Rejected ${dummyKey}`), dummyKey);
assert.equal(redacted.includes(dummyKey), false);
assert.match(redacted, /\[redacted\]/);
writeOpenRouterSettings({ apiKey: "", modelId: "vendor/alpha" }, storage);
assert.deepEqual(readOpenRouterSettings(storage), { apiKey: "", modelId: "vendor/alpha" });
clearOpenRouterSettings(storage);
assert.deepEqual(readOpenRouterSettings(storage), { apiKey: "", modelId: "" });

const request = createOpenRouterRequest({
	apiKey: dummyKey,
	modelId: "manual/exact-model-id",
	prompt: "Describe the safest next step.",
});
assert.equal(request.url, OPENROUTER_CHAT_URL);
assert.equal(request.init.method, "POST");
assert.equal(request.init.headers.Authorization, `Bearer ${dummyKey}`);
assert.equal(request.url.includes(dummyKey), false);
assert.equal(request.init.body.includes(dummyKey), false);
assert.deepEqual(parseJson(request.init.body), {
	model: "manual/exact-model-id",
	messages: [{ role: "user", content: "Describe the safest next step." }],
});

let captured;
const reply = await openRouterChat({
	apiKey: dummyKey,
	modelId: "vendor/alpha",
	prompt: "Hello",
	fetchImpl: async (url, init) => {
		captured = { url, init };
		return {
			ok: true,
			status: 200,
			json: async () => ({ choices: [{ message: { content: "Safe response" } }] }),
		};
	},
});
assert.equal(reply, "Safe response");
assert.equal(parseJson(captured.init.body).model, "vendor/alpha");

let called = false;
await assert.rejects(
	openRouterChat({
		apiKey: dummyKey,
		modelId: "",
		prompt: "Hello",
		fetchImpl: async () => {
			called = true;
		},
	}),
	/select a model/i,
);
assert.equal(called, false, "no request may be sent before explicit model selection");

await assert.rejects(
	openRouterChat({
		apiKey: dummyKey,
		modelId: "vendor/alpha",
		prompt: "Hello",
		fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ choices: [] }) }),
	}),
	/no usable message/i,
);

process.stdout.write("OpenRouter catalog, selection, storage, redaction, and request tests passed.\n");
