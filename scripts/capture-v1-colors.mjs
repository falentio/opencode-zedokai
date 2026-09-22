#!/usr/bin/env node
// Rebuilds test/expected-colors.json from the v1 theme files at a git ref.
//
// Usage: node scripts/capture-v1-colors.mjs [ref] [--write]
//
// The baseline is what the v2 themes are checked against, so it has to come from
// the v1 files, not from the v2 ones. The default ref is the last commit that
// shipped the v1 package. Without --write the script prints the result and
// leaves the file alone.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ref = process.argv[2]?.startsWith("--") || !process.argv[2] ? "5cb4115" : process.argv[2];
const write = process.argv.includes("--write");

const listing = execFileSync("git", ["ls-tree", "--name-only", `${ref}:themes`], { cwd: root, encoding: "utf8" });
const files = listing.trim().split("\n").filter((name) => name.endsWith(".json")).sort();

const captured = {};
for (const file of files) {
  const raw = JSON.parse(execFileSync("git", ["show", `${ref}:themes/${file}`], { cwd: root, encoding: "utf8" }));
  const defs = raw.defs ?? {};
  const deref = (value, chain = []) => {
    if (typeof value !== "string") return value;
    if (value.startsWith("#") || value === "none" || value === "transparent") return value.toLowerCase();
    if (chain.includes(value)) throw new Error(`circular color reference: ${[...chain, value].join(" -> ")}`);
    const next = defs[value] ?? raw.theme?.[value];
    if (next && typeof next === "object") return deref(next.dark, [...chain, value]);
    return deref(next, [...chain, value]);
  };
  const tokens = {};
  for (const [key, value] of Object.entries(raw.theme)) {
    tokens[key] = { dark: deref(value?.dark ?? value), light: deref(value?.light ?? value) };
  }
  captured[file.replace(/\.json$/, "")] = { tokens };
}

const body = JSON.stringify(captured, null, 2) + "\n";
if (!write) {
  process.stdout.write(body);
} else {
  const target = join(root, "test", "expected-colors.json");
  const current = readFileSync(target, "utf8");
  writeFileSync(target, body);
  console.log(current === body ? `unchanged: ${target}` : `rewritten: ${target}`);
}
