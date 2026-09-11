# @falentio/opencode-zedokai

Zedokai for OpenCode. That is the Monokai Pro theme from Zed, ported to OpenCode's theme format.

Ships all 14 Zed themes, including the Filter variants and the light pair.

| Theme | Zed name |
| --- | --- |
| `zedokai` | Zedokai |
| `zedokai-filter-octagon` | Zedokai (Filter Octagon) |
| `zedokai-filter-ristretto` | Zedokai (Filter Ristretto) |
| `zedokai-filter-spectrum` | Zedokai (Filter Spectrum) |
| `zedokai-filter-machine` | Zedokai (Filter Machine) |
| `zedokai-classic` | Zedokai Classic |
| `zedokai-darker` | Zedokai Darker |
| `zedokai-darker-filter-octagon` | Zedokai Darker (Filter Octagon) |
| `zedokai-darker-filter-ristretto` | Zedokai Darker (Filter Ristretto) |
| `zedokai-darker-filter-spectrum` | Zedokai Darker (Filter Spectrum) |
| `zedokai-darker-filter-machine` | Zedokai Darker (Filter Machine) |
| `zedokai-darker-classic` | Zedokai Darker Classic |
| `zedokai-light` | Zedokai Light |
| `zedokai-light-filter-sun` | Zedokai Light (Filter Sun) |

## Install

```sh
opencode plugin @falentio/opencode-zedokai
```

That is all the setup there is. No JavaScript entrypoint runs. OpenCode reads the `oc-themes` field in `package.json`, copies the bundled theme files into the project theme directory, and the themes appear in `/theme`.

Then pick one:

```sh
/theme
```

Or pin it in `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "theme": "zedokai"
}
```

## Why there is no plugin code

OpenCode resolves theme-only packages from the `oc-themes` manifest field. A package that lists relative theme paths there gets a TUI target with no module to load. This package uses exactly that path, so it ships JSON and nothing else. No dependencies, no build step, no server hook writing files at startup.

The only code in the repo is the generator and the tests. They exist for maintainers, not for users.

## Develop

```sh
npm run check
```

`npm run check` runs the theme validation tests. There is no build.

## Regenerate themes

The theme JSON is generated from the upstream Zed theme, not hand-edited. Clone [slymax/zedokai](https://github.com/slymax/zedokai) and run:

```sh
node scripts/generate-themes.mjs /path/to/zedokai/themes/zedokai.json
```

`scripts/generate-themes.mjs` holds the one place where Zed's nested `syntax.*` keys map onto OpenCode's `syntax*` keys.

After regenerating, the test suite asserts that `oc-themes` lists exactly the files in `themes/`. If a new upstream theme appears, add it there.

## Credits

Zedokai is created by [slymax](https://github.com/slymax) and is based on the [Monokai Pro](https://monokai.pro) color scheme. This package ports those colors to OpenCode.

## License

MIT
