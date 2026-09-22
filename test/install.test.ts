import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundledThemes, installThemes, themeTargetDirectory } from "../src/themes.ts";

// test/expected-colors.json holds the colors the v1 package shipped, captured
// from the v1 theme files before this port. It is the baseline the v2 themes are
// checked against, so it is never regenerated from the v2 files.
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const themesDir = join(packageRoot, "themes");
const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));

const themeFiles = readdirSync(themesDir).filter((file) => file.endsWith(".json")).sort();

test("package exposes both v2 entrypoints so the server loader accepts it", () => {
  assert.equal(pkg["oc-themes"], undefined, "oc-themes is a v1 field and must not be declared");
  assert.equal(pkg.main, undefined, "entrypoints belong in exports, not main");
  assert.deepEqual(pkg.exports, {
    "./server": "./src/server.ts",
    "./tui": "./src/tui.ts",
  });
  assert.match(pkg.engines.opencode, /^\^?2\./, "engines.opencode must require v2");
});

test("install copies every bundled theme and is idempotent", () => {
  const target = mkdtempSync(join(tmpdir(), "zedokai-install-"));
  try {
    const first = installThemes(packageRoot, target);
    assert.deepEqual(first, bundledThemes(packageRoot));
    for (const file of first) {
      assert.ok(existsSync(join(target, file)), `${file} must land in the theme directory`);
    }
    const second = installThemes(packageRoot, target);
    assert.deepEqual(second, [], "a second install must not rewrite identical files");
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("install replaces a theme whose bytes differ", () => {
  const target = mkdtempSync(join(tmpdir(), "zedokai-replace-"));
  try {
    const files = bundledThemes(packageRoot);
    const name = files[0];
    installThemes(packageRoot, target);
    writeFileSync(join(target, name), "{}\n");
    const written = installThemes(packageRoot, target);
    assert.deepEqual(written, [name], "only the changed file is rewritten");
    assert.equal(
      readFileSync(join(target, name), "utf8"),
      readFileSync(join(themesDir, name), "utf8"),
    );
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("project scope writes under .opencode/themes at the repository root", () => {
  const root = mkdtempSync(join(tmpdir(), "zedokai-root-"));
  try {
    mkdirSync(join(root, ".git"), { recursive: true });
    const nested = join(root, "packages", "app");
    mkdirSync(nested, { recursive: true });
    assert.equal(themeTargetDirectory("project", nested), resolve(root, ".opencode", "themes"));
    const loose = mkdtempSync(join(tmpdir(), "zedokai-loose-"));
    try {
      assert.equal(themeTargetDirectory("project", loose), resolve(loose, ".opencode", "themes"));
    } finally {
      rmSync(loose, { recursive: true, force: true });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the themes directory holds exactly the files the package ships", () => {
  assert.ok(themeFiles.length >= 14, `expected at least 14 themes, found ${themeFiles.length}`);
  for (const entry of ["themes", "src"]) {
    assert.ok(pkg.files.includes(entry), `files must include ${entry}`);
  }
});
