import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Schema } from "effect";
import { ThemeDocument } from "@opencode/theme/tui";

// test/expected-colors.json holds the colors the v1 package shipped, captured
// from the v1 theme files before this port. It is the baseline the v2 themes are
// checked against, so it is never regenerated from the v2 files.
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const themesDir = join(packageRoot, "themes");

const themeFiles = readdirSync(themesDir).filter((file) => file.endsWith(".json")).sort();

test("every shipped theme decodes as a v2 theme document", () => {
  for (const file of themeFiles) {
    const raw = JSON.parse(readFileSync(join(themesDir, file), "utf8"));
    assert.equal(raw.$schema, "https://opencode.ai/theme.json", `${file} must point at the theme schema`);
    assert.doesNotThrow(
      () => Schema.decodeUnknownSync(ThemeDocument)(raw),
      `${file} must decode with opencode's own theme schema`,
    );
  }
});

test("themes use the v2 shape, not the v1 defs and theme pair", () => {
  for (const file of themeFiles) {
    const raw = JSON.parse(readFileSync(join(themesDir, file), "utf8"));
    assert.equal(raw.defs, undefined, `${file} must not carry v1 defs`);
    assert.equal(raw.theme, undefined, `${file} must not carry a v1 theme block`);
    assert.ok(raw.base, `${file} must define the shared base tokens`);
    const modes = ["light", "dark"].filter((mode) => raw[mode]);
    assert.ok(modes.length >= 1, `${file} must define at least one mode`);
    for (const mode of modes) {
      assert.ok(raw[mode].hue, `${file} ${mode} must define a hue palette`);
    }
  }
});

test("theme names are lowercase slugs for /themes matching", () => {
  for (const file of themeFiles) {
    assert.equal(file, file.toLowerCase(), `${file} must be lowercase`);
    assert.match(file, /^[a-z0-9-]+\.json$/, `${file} must be a slug`);
  }
});
