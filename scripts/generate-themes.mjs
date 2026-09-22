// Regenerates themes/*.json from a checkout of https://github.com/slymax/zedokai.
// Usage: node scripts/generate-themes.mjs /path/to/zedokai/themes/zedokai.json
//
// The upstream Zed style is mapped onto the token names opencode v1 used, then
// opencode's own migrateV1 turns that into a v2 theme document. Keeping the
// format conversion in opencode's code means the hue scales and semantic
// references match what the theme system expects, instead of a local guess.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateV1, ThemeDocument } from "@opencode/theme/tui";
import { Schema } from "effect";

const THEME_KEYS = [
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
];

// s is the Zed theme style; syntax is the nested s.syntax map.
const MAP = {
  primary: (s) => s["text.accent"],
  secondary: (s) => s.syntax.attribute.color,
  accent: (s) => s.syntax.string.color,
  error: (s) => s.error,
  warning: (s) => s.warning,
  success: (s) => s.created,
  info: (s) => s.syntax.attribute.color,
  text: (s) => s.text,
  textMuted: (s) => s["text.muted"],
  background: (s) => s.background,
  backgroundPanel: (s) => s["panel.background"],
  backgroundElement: (s) => s["element.background"],
  border: (s) => s.border,
  borderActive: (s) => s["border.focused"],
  borderSubtle: (s) => s["border.variant"],
  diffAdded: (s) => s.created,
  diffRemoved: (s) => s.deleted,
  diffContext: (s) => s["text.muted"],
  diffHunkHeader: (s) => s["text.muted"],
  diffHighlightAdded: (s) => s.created,
  diffHighlightRemoved: (s) => s.deleted,
  diffAddedBg: (s) => s["editor.document_highlight.read_background"],
  diffRemovedBg: (s) => s["editor.document_highlight.read_background"],
  diffContextBg: (s) => s["editor.gutter.background"],
  diffLineNumber: (s) => s["editor.line_number"],
  diffAddedLineNumberBg: (s) => s["editor.document_highlight.read_background"],
  diffRemovedLineNumberBg: (s) => s["editor.document_highlight.read_background"],
  markdownText: (s) => s.text,
  markdownHeading: (s) => s.syntax.tag.color,
  markdownLink: (s) => s.syntax.link_uri.color,
  markdownLinkText: (s) => s.syntax.link_text.color,
  markdownCode: (s) => s.syntax.string.color,
  markdownBlockQuote: (s) => s.syntax.comment.color,
  markdownEmph: (s) => s.syntax["string.special"].color,
  markdownStrong: (s) => s.syntax.title.color,
  markdownHorizontalRule: (s) => s["text.muted"],
  markdownListItem: (s) => s.syntax.function.color,
  markdownListEnumeration: (s) => s.syntax.number.color,
  markdownImage: (s) => s.syntax.link_uri.color,
  markdownImageText: (s) => s.syntax.link_text.color,
  markdownCodeBlock: (s) => s.text,
  syntaxComment: (s) => s.syntax.comment.color,
  syntaxKeyword: (s) => s.syntax.keyword.color,
  syntaxFunction: (s) => s.syntax.function.color,
  syntaxVariable: (s) => s.syntax.variable.color,
  syntaxString: (s) => s.syntax.string.color,
  syntaxNumber: (s) => s.syntax.number.color,
  syntaxType: (s) => s.syntax.type.color,
  syntaxOperator: (s) => s.syntax.operator.color,
  syntaxPunctuation: (s) => s.syntax.punctuation.color,
};

const source = process.argv[2];
if (!source) {
  console.error("usage: node scripts/generate-themes.mjs <path to zedokai themes/zedokai.json>");
  process.exit(1);
}

const themesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "themes");
const upstream = JSON.parse(readFileSync(source, "utf8"));

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[()]/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

// A v1-format document. Both modes carry the same colors because the upstream
// Zed theme defines one palette, not a light/dark pair.
function v1Document(style) {
  const defs = {};
  const theme = {};
  for (const key of THEME_KEYS) {
    const hex = MAP[key](style);
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
      throw new Error(`unexpected color ${hex} for ${key}`);
    }
    const name = `${key}-${hex.slice(1)}`;
    defs[name] = hex;
    theme[key] = { dark: name, light: name };
  }
  return { defs, theme };
}

rmSync(themesDir, { recursive: true, force: true });
mkdirSync(themesDir, { recursive: true });

const written = [];
for (const theme of upstream.themes) {
  const name = slug(theme.name);
  const document = { $schema: "https://opencode.ai/theme.json", ...migrateV1(v1Document(theme.style)) };
  Schema.decodeUnknownSync(ThemeDocument)(document);
  writeFileSync(join(themesDir, `${name}.json`), `${JSON.stringify(document, null, 2)}\n`);
  written.push(`${name} (${theme.name})`);
}

console.log(`generated ${written.length} themes from ${upstream.name}:\n${written.join("\n")}`);
