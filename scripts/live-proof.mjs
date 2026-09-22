#!/usr/bin/env node
// Drives the real opencode v2 binary in a sandbox and proves the plugin installs
// the themes and the TUI paints with one.
//
// Usage: node scripts/live-proof.mjs
//
// Needs OPENCODE_BIN pointing at an opencode v2 binary, or one on PATH.
//
// Both ways of configuring the plugin are driven. A package that only exports
// `./tui` works from `cli.json` but makes the server loader report
// "Plugin entrypoint not found" when it is configured in `opencode.json`, and
// then the TUI never receives the plugin at all. That difference shipped once,
// so it is checked here.
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
const spec = `file:${tarballPath}`;

const failures = [];

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), "zedokai-live-"));
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key === "OPENCODE" || key.startsWith("OPENCODE_")) delete env[key];
  }
  env.HOME = join(root, "home");
  env.XDG_CONFIG_HOME = join(root, "config");
  env.XDG_DATA_HOME = join(root, "data");
  env.XDG_CACHE_HOME = join(root, "cache");
  env.XDG_STATE_HOME = join(root, "state");
  env.TMPDIR = join(root, "tmp");
  for (const dir of [env.HOME, env.XDG_CONFIG_HOME, env.XDG_DATA_HOME, env.XDG_CACHE_HOME, env.XDG_STATE_HOME, env.TMPDIR]) {
    mkdirSync(dir, { recursive: true });
  }
  mkdirSync(join(env.XDG_CONFIG_HOME, "opencode"), { recursive: true });
  mkdirSync(join(root, "work"), { recursive: true });
  return { root, env, work: join(root, "work") };
}

function drive(box, logName) {
  const log = join(box.root, logName);
  // The TUI needs a controlling terminal, so run it under `script`.
  const command = `env ${Object.entries(box.env)
    .filter(([key]) => key.startsWith("XDG_") || key === "HOME" || key === "TMPDIR")
    .map(([key, value]) => `${key}=${value}`)
    .join(" ")} ${binary} --standalone --print-logs --log-level debug`;
  spawnSync("script", ["-qec", command, log], { cwd: box.work, timeout: 120_000, encoding: "utf8" });
  return readFileSync(log, "utf8");
}

function themeFiles(themesDir) {
  try {
    return readdirSync(themesDir).filter((file) => file.endsWith(".json")).sort();
  } catch {
    return [];
  }
}

function assertInstalled(label, box, firstLog, secondLog) {
  const themesDir = join(box.env.XDG_CONFIG_HOME, "opencode", "themes");
  const installed = themeFiles(themesDir);
  if (installed.length < 14) failures.push(`${label}: installed ${installed.length} themes, expected 14`);
  if (firstLog.includes("Plugin entrypoint not found")) {
    failures.push(`${label}: the plugin loader reported "Plugin entrypoint not found"`);
  }
  if (firstLog.includes("failed to load plugin")) failures.push(`${label}: the plugin failed to load`);
  if (firstLog.includes("Failed to load theme")) failures.push(`${label}: a theme failed to load`);
  if (!firstLog.includes("48;2;45;42;46")) failures.push(`${label}: the TUI never painted the Zedokai background #2d2a2e`);
  if (!/Zedokai: installed 14 themes/.test(firstLog)) failures.push(`${label}: the plugin did not report the install`);
  const before = installed.map((file) => `${file} ${readFileSync(join(themesDir, file)).length}`);
  if (secondLog.includes("Zedokai: installed")) failures.push(`${label}: a second start reported an install it did not need to do`);
  const after = themeFiles(themesDir).map((file) => `${file} ${readFileSync(join(themesDir, file)).length}`);
  if (JSON.stringify(before) !== JSON.stringify(after)) failures.push(`${label}: a second start rewrote the theme files`);
}

// Path 1: the CLI-only config. This is what `opencode plugin add` writes.
{
  const box = sandbox();
  writeFileSync(
    join(box.env.XDG_CONFIG_HOME, "opencode", "cli.json"),
    JSON.stringify({ $schema: "https://opencode.ai/v2/cli.json", theme: { name: "zedokai", mode: "dark" }, plugins: [spec] }, null, 2) + "\n",
  );
  const first = drive(box, "first.log");
  const second = drive(box, "second.log");
  assertInstalled("cli.json", box, first, second);
  rmSync(box.root, { recursive: true, force: true });
}

// Path 2: the server config. The server resolves the package itself before the
// TUI hears about it, so a missing `./server` entrypoint breaks the whole plugin.
{
  const box = sandbox();
  writeFileSync(
    join(box.work, "opencode.json"),
    JSON.stringify({ $schema: "https://opencode.ai/config.json", plugin: [spec] }, null, 2) + "\n",
  );
  writeFileSync(
    join(box.env.XDG_CONFIG_HOME, "opencode", "cli.json"),
    JSON.stringify({ $schema: "https://opencode.ai/v2/cli.json", theme: { name: "zedokai", mode: "dark" } }, null, 2) + "\n",
  );
  const first = drive(box, "first.log");
  const second = drive(box, "second.log");
  assertInstalled("opencode.json", box, first, second);
  rmSync(box.root, { recursive: true, force: true });
}

rmSync(tarballPath, { force: true });

if (failures.length > 0) {
  console.error(`live-proof: FAIL on ${reported}`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`live-proof: PASS on ${reported}`);
console.log(`  cli.json: 14 themes installed, the TUI painted Zedokai background #2d2a2e`);
console.log(`  opencode.json: 14 themes installed, the TUI painted Zedokai background #2d2a2e`);
console.log(`  a second start rewrote nothing`);
