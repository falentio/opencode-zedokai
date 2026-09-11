import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const themesDir = join(packageRoot, "themes");
const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));

const THEME_KEYS = [
  "primary", "secondary", "accent", "error", "warning", "success", "info", "text", "textMuted",
  "background", "backgroundPanel", "backgroundElement", "border", "borderActive", "borderSubtle",
  "diffAdded", "diffRemoved", "diffContext", "diffHunkHeader", "diffHighlightAdded", "diffHighlightRemoved",
  "diffAddedBg", "diffRemovedBg", "diffContextBg", "diffLineNumber", "diffAddedLineNumberBg",
  "diffRemovedLineNumberBg", "markdownText", "markdownHeading", "markdownLink", "markdownLinkText",
  "markdownCode", "markdownBlockQuote", "markdownEmph", "markdownStrong", "markdownHorizontalRule",
  "markdownListItem", "markdownListEnumeration", "markdownImage", "markdownImageText", "markdownCodeBlock",
  "syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxVariable", "syntaxString", "syntaxNumber",
  "syntaxType", "syntaxOperator", "syntaxPunctuation",
];

const themeFiles = readdirSync(themesDir).filter((file) => file.endsWith(".json")).sort();

test("package declares oc-themes so opencode detects a tui theme target", () => {
  assert.ok(Array.isArray(pkg["oc-themes"]), "oc-themes must be an array");
  assert.ok(pkg["oc-themes"].length > 0, "oc-themes must not be empty");
  assert.equal(pkg.main, undefined, "theme-only packages must not declare main");
  assert.equal(pkg.exports, undefined, "theme-only packages must not declare exports");
  assert.equal(pkg.dependencies, undefined, "theme-only packages must have no runtime dependencies");
});

test("every oc-themes entry is a relative in-package file that exists", () => {
  for (const entry of pkg["oc-themes"]) {
    assert.ok(!entry.startsWith("/"), `${entry} must be relative, not absolute`);
    assert.ok(!entry.startsWith("file://"), `${entry} must not be a file:// URL`);
    const abs = resolve(packageRoot, entry);
    assert.ok(abs.startsWith(packageRoot), `${entry} must stay inside the package`);
    assert.ok(existsSync(abs), `${entry} does not exist`);
  }
});

test("oc-themes lists exactly the shipped themes", () => {
  assert.deepEqual(pkg["oc-themes"], themeFiles.map((file) => `themes/${file}`));
  assert.ok(themeFiles.length >= 14, `expected at least 14 themes, found ${themeFiles.length}`);
});

test("files field ships themes, test, and scripts", () => {
  for (const entry of ["themes", "test", "scripts"]) {
    assert.ok(pkg.files.includes(entry), `files must include ${entry}`);
  }
});

test("shipped themes are valid opencode themes and cover every key", () => {
  for (const file of themeFiles) {
    const raw = JSON.parse(readFileSync(join(themesDir, file), "utf8"));
    assert.equal(typeof raw.defs, "object", `${file} must define defs`);
    assert.deepEqual(
      Object.keys(raw.theme).sort(),
      [...THEME_KEYS].sort(),
      `${file} must define exactly the ${THEME_KEYS.length} theme keys`,
    );
    for (const [key, value] of Object.entries(raw.theme)) {
      assert.equal(typeof value.dark, "string", `${file}.${key}.dark must be a string`);
      assert.equal(typeof value.light, "string", `${file}.${key}.light must be a string`);
      assert.ok(value.dark in raw.defs, `${file}.${key}.dark must reference a def`);
      assert.ok(value.light in raw.defs, `${file}.${key}.light must reference a def`);
    }
  }
});

test("theme names are lowercase slugs for /theme matching", () => {
  for (const file of themeFiles) {
    assert.equal(file, file.toLowerCase(), `${file} must be lowercase`);
    assert.match(file, /^[a-z0-9-]+\.json$/, `${file} must be a slug`);
  }
});
