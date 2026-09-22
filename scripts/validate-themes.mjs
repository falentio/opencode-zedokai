#!/usr/bin/env node
// Validates every shipped theme with opencode's own decoder and compares the
// resolved colors against the colors the v1 package shipped.
//
// Usage: node scripts/validate-themes.mjs [--json]
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Schema } from "effect";
import { ThemeDocument, resolveThemeDocument, themeModes } from "@opencode/theme/tui";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const themesDir = join(root, "themes");
const expectedPath = join(root, "test", "expected-colors.json");

// v1 theme key -> path in the resolved v2 theme. One row per shipped token.
const TOKEN_PATHS = {
  error: ["text", "feedback", "error", "base"],
  warning: ["text", "feedback", "warning", "base"],
  success: ["text", "feedback", "success", "base"],
  info: ["text", "feedback", "info", "base"],
  text: ["text", "base"],
  textMuted: ["text", "muted"],
  background: ["background", "base"],
  backgroundPanel: ["background", "raised", "base"],
  backgroundElement: ["background", "raised", "high"],
  border: ["border", "base"],
  borderActive: ["scrollbar", "base"],
  diffAdded: ["diff", "text", "added"],
  diffRemoved: ["diff", "text", "removed"],
  diffContext: ["diff", "text", "context"],
  diffHunkHeader: ["diff", "text", "hunkHeader"],
  diffHighlightAdded: ["diff", "highlight", "added"],
  diffHighlightRemoved: ["diff", "highlight", "removed"],
  diffAddedBg: ["diff", "background", "added"],
  diffRemovedBg: ["diff", "background", "removed"],
  diffContextBg: ["diff", "background", "context"],
  diffLineNumber: ["diff", "lineNumber", "text"],
  diffAddedLineNumberBg: ["diff", "lineNumber", "background", "added"],
  diffRemovedLineNumberBg: ["diff", "lineNumber", "background", "removed"],
  markdownText: ["markdown", "text"],
  markdownHeading: ["markdown", "heading"],
  markdownLink: ["markdown", "link"],
  markdownLinkText: ["markdown", "linkText"],
  markdownCode: ["markdown", "code"],
  markdownBlockQuote: ["markdown", "blockQuote"],
  markdownEmph: ["markdown", "emphasis"],
  markdownStrong: ["markdown", "strong"],
  markdownHorizontalRule: ["markdown", "horizontalRule"],
  markdownListItem: ["markdown", "listItem"],
  markdownListEnumeration: ["markdown", "listEnumeration"],
  markdownImage: ["markdown", "image"],
  markdownImageText: ["markdown", "imageText"],
  markdownCodeBlock: ["markdown", "codeBlock"],
  syntaxComment: ["syntax", "comment"],
  syntaxKeyword: ["syntax", "keyword"],
  syntaxFunction: ["syntax", "function"],
  syntaxVariable: ["syntax", "variable"],
  syntaxString: ["syntax", "string"],
  syntaxNumber: ["syntax", "number"],
  syntaxType: ["syntax", "type"],
  syntaxOperator: ["syntax", "operator"],
  syntaxPunctuation: ["syntax", "punctuation"],
};

// The palette colors live in the hue scales, not in semantic tokens. `secondary`
// lands on whichever base hue opencode's migration inferred for it.
const HUE_PATHS = {
  primary: ["interactive", "200"],
  accent: ["accent", "200"],
};
const SECONDARY_HUES = ["cyan", "green", "blue", "purple", "red", "orange", "yellow", "gray"];

// v1 shipped border and borderSubtle as the same color, and v2 has one border
// token, so the migration keeps `border` and drops `borderSubtle`. Check that
// assumption against the baseline rather than trusting it.
function checkBorderSubtle(name, resolved, want, mode, failures, count) {
  const expected = want.tokens.borderSubtle?.[mode];
  if (expected === undefined) return count;
  const actual = toHex(resolved.border.base);
  count += 1;
  if (actual !== expected.toLowerCase()) {
    failures.push(`${name} (${mode}): borderSubtle ${expected} has no v2 home; border is ${actual}`);
  }
  return count;
}

const toHex = (color) => {
  const ints = color.toInts();
  return "#" + ints.slice(0, 3).map((value) => value.toString(16).padStart(2, "0")).join("");
};
const at = (object, path) => path.reduce((value, key) => value?.[key], object);

export function validateThemes() {
  const failures = [];
  const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
  const files = readdirSync(themesDir).filter((file) => file.endsWith(".json")).sort();

  if (files.length !== Object.keys(expected).length) {
    failures.push(
      `shipped ${files.length} themes, expected ${Object.keys(expected).length}`,
    );
  }

  let checked = 0;
  for (const file of files) {
    const name = file.replace(/\.json$/, "");
    const want = expected[name];
    if (!want) {
      failures.push(`${name}: no captured colors, regenerate test/expected-colors.json`);
      continue;
    }
    let document;
    try {
      document = Schema.decodeUnknownSync(ThemeDocument)(JSON.parse(readFileSync(join(themesDir, file), "utf8")));
    } catch (error) {
      failures.push(`${name}: rejected by the v2 decoder: ${String(error?.message ?? error).split("\n").slice(0, 2).join(" | ")}`);
      continue;
    }
    const modes = themeModes(document);
    if (modes.length === 0) {
      failures.push(`${name}: declares no color mode`);
      continue;
    }
    for (const mode of modes) {
      const resolved = resolveThemeDocument(document, mode);
      for (const [key, path] of Object.entries(TOKEN_PATHS)) {
        const expectedHex = want.tokens[key]?.[mode];
        if (expectedHex === undefined) continue;
        const actual = at(resolved, path);
        if (actual === undefined) {
          failures.push(`${name} (${mode}): ${key} missing at ${path.join(".")}`);
          continue;
        }
        checked += 1;
        const actualHex = toHex(actual);
        if (actualHex !== expectedHex.toLowerCase()) {
          failures.push(`${name} (${mode}): ${key} is ${actualHex}, v1 shipped ${expectedHex}`);
        }
      }
      for (const [key, path] of Object.entries(HUE_PATHS)) {
        const expectedHex = want.tokens[key]?.[mode];
        if (expectedHex === undefined) continue;
        const actual = at(resolved.hue, path);
        if (actual === undefined) {
          failures.push(`${name} (${mode}): ${key} missing at hue.${path.join(".")}`);
          continue;
        }
        checked += 1;
        const actualHex = toHex(actual);
        if (actualHex !== expectedHex.toLowerCase()) {
          failures.push(`${name} (${mode}): ${key} is ${actualHex}, v1 shipped ${expectedHex}`);
        }
      }
      const secondaryHex = want.tokens.secondary?.[mode];
      if (secondaryHex !== undefined) {
        const match = SECONDARY_HUES.find((hue) => toHex(resolved.hue[hue]["200"]) === secondaryHex.toLowerCase());
        checked += 1;
        if (!match) {
          const seen = SECONDARY_HUES.map((hue) => `${hue}=${toHex(resolved.hue[hue]["200"])}`).join(" ");
          failures.push(`${name} (${mode}): secondary ${secondaryHex} matches no hue anchor (${seen})`);
        } else if (!resolved.categorical.some((scale) => toHex(scale["200"]) === secondaryHex.toLowerCase())) {
          failures.push(`${name} (${mode}): secondary ${secondaryHex} is not among the categorical hues`);
        }
      }
      checked = checkBorderSubtle(name, resolved, want, mode, failures, checked);
    }
  }
  return { failures, checked, themes: files.length };
}

const { failures, checked, themes } = validateThemes();
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ themes, checked, failures }, null, 2));
} else if (failures.length === 0) {
  console.log(`ok: ${themes} themes, ${checked} token colors match the v1 package`);
} else {
  console.error(`failed: ${failures.length} problem(s) across ${themes} themes`);
  for (const failure of failures) console.error(`  ${failure}`);
}
process.exit(failures.length === 0 ? 0 : 1);
