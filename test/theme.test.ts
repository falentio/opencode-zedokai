import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadThemes, parseTheme, THEME_KEYS } from "../src/theme.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const themesDir = join(packageRoot, "themes");

function fullTheme(overrides = {}) {
  const theme = {};
  for (const key of THEME_KEYS) theme[key] = { dark: "pink", light: "pink" };
  return {
    $schema: "https://opencode.ai/theme.json",
    defs: { pink: "#ff6188" },
    theme: { ...theme, ...overrides },
  };
}

test("parseTheme accepts a defs-backed theme", () => {
  const parsed = parseTheme("zedokai", JSON.stringify(fullTheme()));
  assert.equal(parsed.name, "zedokai");
  assert.equal(parsed.defs.pink, "#ff6188");
  assert.deepEqual(parsed.theme.primary, { dark: "pink", light: "pink" });
});

test("parseTheme rejects a theme missing required keys", () => {
  const { markdownImageText, ...partial } = fullTheme().theme;
  const raw = { ...fullTheme(), theme: partial };
  assert.throws(() => parseTheme("bad.json", JSON.stringify(raw)), /missing theme keys: markdownImageText/);
});

test("parseTheme rejects a color referencing an unknown def", () => {
  const raw = fullTheme({ primary: { dark: "missing", light: "pink" } });
  assert.throws(() => parseTheme("bad.json", JSON.stringify(raw)), /unknown color reference/);
});

test("shipped themes are valid opencode themes and cover every key", () => {
  const names = readdirSync(themesDir).filter((file) => file.endsWith(".json"));
  assert.ok(names.length >= 14, `expected at least 14 shipped themes, found ${names.length}`);
  const themes = loadThemes(packageRoot);
  for (const theme of themes) {
    assert.equal(theme.name, theme.name.toLowerCase(), `${theme.name} must be lowercase for /theme matching`);
    assert.deepEqual(
      [...Object.keys(theme.theme)].sort(),
      [...THEME_KEYS].sort(),
      `${theme.name} must define exactly the ${THEME_KEYS.length} theme keys`,
    );
    for (const [key, value] of Object.entries(theme.theme)) {
      assert.ok(value && typeof value === "object", `${theme.name}.${key} must be a color or dark/light pair`);
      assert.equal(typeof value.dark, "string", `${theme.name}.${key}.dark must be a string`);
      assert.equal(typeof value.light, "string", `${theme.name}.${key}.light must be a string`);
    }
  }
});

test("theme files declare the opencode theme schema", () => {
  for (const file of readdirSync(themesDir).filter((name) => name.endsWith(".json"))) {
    const raw = JSON.parse(readFileSync(join(themesDir, file), "utf8")) as { $schema?: string };
    assert.equal(raw.$schema, "https://opencode.ai/theme.json", `${file} must declare the theme schema`);
  }
});
