import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const sentinel = "NEUROSYNC_MUST_NOT_REACH_THE_BROWSER";
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is unavailable");

const build = spawnSync(
	process.execPath,
	[npmCli, "run", "build", "--silent"],
	{
		env: {
			...process.env,
			API_KEY: sentinel,
			GEMINI_API_KEY: sentinel,
			OPENROUTER_API_KEY: sentinel,
		},
		stdio: "inherit",
	},
);

if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const files = readdirSync("dist", { recursive: true, withFileTypes: true })
	.filter((entry) => entry.isFile())
	.map((entry) => path.join(entry.parentPath, entry.name));

if (files.some((file) => readFileSync(file).includes(sentinel))) {
	throw new Error("Provider credential was bundled into dist");
}

let manifest;
try {
	manifest = JSON.parse(readFileSync("dist/manifest.json", "utf8"));
} catch (error) {
	throw new Error("Production web manifest is invalid", { cause: error });
}
if (!manifest.icons.every(({ src }) => existsSync(path.join("dist", src)))) {
	throw new Error("Web manifest references a missing icon");
}

process.stdout.write(
	"Provider credential is absent and manifest assets exist in the production bundle.\n",
);
