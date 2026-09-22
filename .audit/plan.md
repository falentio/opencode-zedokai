# opencode-zedokai v2 port — run plan

## Definition of done (falsifiable)

`@falentio/opencode-zedokai` is a v2-only CLI plugin that ships the 14 Zedokai themes as v2 theme documents. Predicate, all four must hold:

1. `pnpm check` is green, and the suite validates every theme with opencode's own `@opencode/theme` decoder (`ThemeDocument.make`), not a hand-rolled schema.
2. Every token mapping resolves to the exact hex the v1 package shipped. The check reads `test/expected-colors.json`, captured from the v1 files before the rewrite.
3. In a v2 sandbox, `opencode` loads the package from `cli.json`, the plugin writes the themes into the config theme directory, and the TUI renders with a Zedokai background. Proven by a PTY drive of the real binary.
4. No v1 artifact survives. No `oc-themes`, no `engines.opencode: ^1`, no v1-format theme JSON, no v1 README claims.

## Why figure-it-out

A cross-format migration with a one-way door (the theme file format) that the user reviews after stepping away. No narrower playbook covers it: it is a port plus a package redesign, not a single-unit feature.

## Facts established

- v2 has no `oc-themes` field. The v2 binary contains zero occurrences of the string.
- v2 discovers themes by scanning `themes/*.json` under the config dir and each ancestor `.opencode` dir.
- v2 accepts a v1-format file by migrating it at runtime, but the docs say plugins do not register themes and the port is v2-only, so the package ships native v2 documents.
- A v2 CLI plugin is a package with `exports["./tui"]` exporting `{ id, setup }`. Proven live: a local package loaded, `setup` ran, wrote a theme, and `SIGUSR2` made the TUI pick it up.
- `opencode plugin add` requires a `./tui` or `./server` export and writes the spec into `cli.json`. A theme-only package is rejected. This is why the port needs plugin code at all.
- `@opencode/theme`'s `migrateV1` preserves the v1 colors exactly and emits semantic hue references plus a `@dialog` block. A hand-rolled converter produced a NaN color in the same bakeoff, so the port uses `migrateV1` frozen at build time.
- The v2 CLI plugin loader does not resolve the `@opencode/plugin/tui` specifier for installed plugins, so the entrypoint imports it for types only.

## Rigor level

High. The theme format is a one-way door, the published package is consumed by strangers, and the deliverable is a package other people install. Gates: the captured-color test, the official decoder, and a live PTY drive of the v2 binary.

## Phases

### Phase 1. Scaffold and harness (before any port)

- Capture `test/expected-colors.json` from the current v1 themes.
- Add `@opencode/theme` and `effect` as devDependencies so the suite can use the real decoder.
- Write `scripts/validate-themes.mjs`, the lever: it decodes every shipped theme with the official schema and compares all token mappings against `expected-colors.json`. It must fail on the current v1 files, which proves the check can detect the old format.

### Phase 2. Port the themes

- Rewrite `scripts/generate-themes.mjs` to emit v2 documents. The generator maps the upstream Zed style onto v1 keys as today, then runs opencode's `migrateV1` to produce the v2 document, so the color math stays opencode's own.
- Regenerate `themes/*.json`.
- Gate: `node scripts/validate-themes.mjs` green.

### Phase 3. The plugin

- Add `src/tui.ts`: `export default { id, setup }`. `setup` copies the bundled themes into the target theme directory. Target: global config themes dir by default, project `.opencode/themes` when the `local` option is set. Writes only when the file is missing or differs, so restarts stay idempotent.
- Add `exports["./tui"]` to package.json and drop `oc-themes`.
- Keep the package dependency-free at runtime. The plugin imports nothing but `node:fs`, `node:path`, `node:url`.
- Gate: unit test the install function against a temp dir; a second run must not rewrite.

### Phase 4. Live proof

- Build the package, install it into a v2 sandbox from a tarball, drive the TUI in a PTY.
- Gate: the theme lands, no `Failed to load theme`, and the TUI paints with the Zedokai background color.

### Phase 5. Package, docs, and cleanup

- Rewrite `package.json`: v2 engine, `exports`, `files`, scripts, no v1 fields.
- Rewrite the README for the v2 install flow and the v2 theme format.
- Rewrite the tests to assert the v2 contract: exports shape, theme count, decoder validity, color fidelity, no v1 fields.
- Gate: `pnpm check` green on a clean clone; `npm pack` contains only what it should.

## Audit trail

`decisions.tsv` in the repo root, committed, because a reviewer needs the trail to trust a format migration.
