#!/usr/bin/env node
// Drives the real opencode v2 binary in a sandbox and proves the plugin installs
// the themes and the TUI paints with one.
//
// Usage: node scripts/live-proof.mjs
//
// Needs OPENCODE_BIN pointing at an opencode v2 binary, or one on PATH.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const binary = process.env.OPENCODE_BIN ?? "opencode";

const version = spawnSync(binary, ["--version"], { encoding: "utf8" });
if (version.status !== 0) {
  console.error(`live-proof: cannot run ${binary}: ${version.stderr ?? version.error?.message}`);
  process.exit(2);
}
const reported = (version.stdout ?? "").trim();
if (!/\bv?2\./.test(reported)) {
  console.error(`live-proof: need an opencode v2 binary, got "${reported}"`);
  process.exit(2);
}

const tarball = execFileSync("npm", ["pack", "--silent"], { cwd: packageRoot, encoding: "utf8" })
  .trim()
  .split("\n")
  .at(-1);
const tarballPath = join(packageRoot, tarball);

const sandbox = mkdtempSync(join(tmpdir(), "zedokai-live-"));
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (key === "OPENCODE" || key.startsWith("OPENCODE_")) delete env[key];
}
env.HOME = join(sandbox, "home");
env.XDG_CONFIG_HOME = join(sandbox, "config");
env.XDG_DATA_HOME = join(sandbox, "data");
env.XDG_CACHE_HOME = join(sandbox, "cache");
env.XDG_STATE_HOME = join(sandbox, "state");
env.TMPDIR = join(sandbox, "tmp");
for (const dir of [env.HOME, env.XDG_CONFIG_HOME, env.XDG_DATA_HOME, env.XDG_CACHE_HOME, env.XDG_STATE_HOME, env.TMPDIR]) {
  mkdirSync(dir, { recursive: true });
}

const work = join(sandbox, "work");
mkdirSync(work, { recursive: true });
mkdirSync(join(env.XDG_CONFIG_HOME, "opencode"), { recursive: true });
writeFileSync(
  join(env.XDG_CONFIG_HOME, "opencode", "cli.json"),
  JSON.stringify(
    {
      $schema: "https://opencode.ai/v2/cli.json",
      theme: { name: "zedokai", mode: "dark" },
      plugins: [`file:${tarballPath}`],
    },
    null,
    2,
  ) + "\n",
);

function drive(logName) {
  const log = join(sandbox, logName);
  // The TUI needs a controlling terminal, so run it under `script`.
  const command = `env ${Object.entries(env)
    .filter(([key]) => key.startsWith("XDG_") || key === "HOME" || key === "TMPDIR")
    .map(([key, value]) => `${key}=${value}`)
    .join(" ")} ${binary} --standalone --print-logs --log-level warn`;
  const result = spawnSync("script", ["-qec", command, log], { cwd: work, timeout: 90_000, encoding: "utf8" });
  return { log, result };
}

const first = drive("first.log");
const themesDir = join(env.XDG_CONFIG_HOME, "opencode", "themes");
const installed = readdirSync(themesDir).filter((file) => file.endsWith(".json")).sort();
const firstLog = readFileSync(first.log, "utf8");
const failures = [];
if (installed.length < 14) failures.push(`installed ${installed.length} themes, expected 14`);
if (firstLog.includes("Cannot find package")) failures.push("plugin failed to load: cannot find package");
if (firstLog.includes("Failed to load theme")) failures.push("a theme failed to load");
if (!firstLog.includes("48;2;45;42;46")) failures.push("the TUI never painted the Zedokai background #2d2a2e");
if (!/Zedokai: installed 14 themes/.test(firstLog)) failures.push("the plugin did not report the install");

const mtimesBefore = installed.map((file) => `${file} ${readFileSync(join(themesDir, file)).length}`);
const second = drive("second.log");
const mtimesAfter = readdirSync(themesDir).filter((file) => file.endsWith(".json")).sort().map((file) => `${file} ${readFileSync(join(themesDir, file)).length}`);
const secondLog = readFileSync(second.log, "utf8");
if (JSON.stringify(mtimesBefore) !== JSON.stringify(mtimesAfter)) failures.push("a second start rewrote the theme files");
if (secondLog.includes("Zedokai: installed")) failures.push("a second start reported an install it did not need to do");

rmSync(sandbox, { recursive: true, force: true });
rmSync(tarballPath, { force: true });

if (failures.length > 0) {
  console.error(`live-proof: FAIL on ${reported}`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`live-proof: PASS on ${reported}`);
console.log(`  14 themes installed into the config theme directory`);
console.log(`  the TUI painted Zedokai background #2d2a2e`);
console.log(`  a second start rewrote nothing`);
