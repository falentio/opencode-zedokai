import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const THEME_KEYS = [
  "primary",
  "secondary",
  "accent",
  "error",
  "warning",
  "success",
  "info",
  "text",
  "textMuted",
  "background",
  "backgroundPanel",
  "backgroundElement",
  "border",
  "borderActive",
  "borderSubtle",
  "diffAdded",
  "diffRemoved",
  "diffContext",
  "diffHunkHeader",
  "diffHighlightAdded",
  "diffHighlightRemoved",
  "diffAddedBg",
  "diffRemovedBg",
  "diffContextBg",
  "diffLineNumber",
  "diffAddedLineNumberBg",
  "diffRemovedLineNumberBg",
  "markdownText",
  "markdownHeading",
  "markdownLink",
  "markdownLinkText",
  "markdownCode",
  "markdownBlockQuote",
  "markdownEmph",
  "markdownStrong",
  "markdownHorizontalRule",
  "markdownListItem",
  "markdownListEnumeration",
  "markdownImage",
  "markdownImageText",
  "markdownCodeBlock",
  "syntaxComment",
  "syntaxKeyword",
  "syntaxFunction",
  "syntaxVariable",
  "syntaxString",
  "syntaxNumber",
  "syntaxType",
  "syntaxOperator",
  "syntaxPunctuation",
] as const;

export type ThemeKey = (typeof THEME_KEYS)[number];
export type ColorPair = { dark: string; light: string };
export type ThemeFile = {
  $schema: string;
  defs?: Record<string, string>;
  theme: Record<ThemeKey, ColorPair>;
};
export type LoadedTheme = { name: string; path: string; defs: Record<string, string>; theme: Record<ThemeKey, ColorPair> };

export function loadThemes(packageRoot: string): LoadedTheme[] {
  const themesDir = join(packageRoot, "themes");
  return readdirSync(themesDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => parseTheme(file.slice(0, -".json".length), readFileSync(join(themesDir, file), "utf8")));
}

export function parseTheme(name: string, text: string): LoadedTheme {
  const data = JSON.parse(text) as ThemeFile;
  if (!data.theme || typeof data.theme !== "object") {
    throw new Error(`${name}: missing "theme" object`);
  }
  const missing = THEME_KEYS.filter((key) => !isColorPair(data.theme[key]));
  if (missing.length > 0) {
    throw new Error(`${name}: missing theme keys: ${missing.join(", ")}`);
  }
  const defs = data.defs ?? {};
  for (const [key, pair] of Object.entries(data.theme)) {
    for (const [mode, color] of Object.entries(pair)) {
      if (!isHex(color) && !(color in defs)) {
        throw new Error(`${name}: unknown color reference ${color} at theme.${key}.${mode}`);
      }
    }
  }
  return { name, path: `themes/${name}.json`, defs, theme: data.theme };
}

export function installThemes(packageRoot: string, targetDir: string): number {
  const themes = loadThemes(packageRoot);
  mkdirSync(targetDir, { recursive: true });
  for (const theme of themes) {
    const file: ThemeFile = { $schema: "https://opencode.ai/theme.json", defs: theme.defs, theme: theme.theme };
    writeFileSync(join(targetDir, `${theme.name}.json`), `${JSON.stringify(file, null, 2)}\n`);
  }
  return themes.length;
}

function isColorPair(value: unknown): value is ColorPair {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ColorPair).dark === "string" &&
    typeof (value as ColorPair).light === "string"
  );
}

function isHex(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value);
}
