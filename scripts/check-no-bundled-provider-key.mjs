import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const sentinel = "NEUROSYNC_MUST_NOT_REACH_THE_BROWSER";
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is unavailable");

const build = spawnSync(
	process.execPath,
	[npmCli, "run", "build", "--silent"],
	{
		env: { ...process.env, API_KEY: sentinel, GEMINI_API_KEY: sentinel },
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

process.stdout.write(
	"Provider credential is absent from the production bundle.\n",
);
