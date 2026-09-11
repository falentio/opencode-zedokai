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

Add the plugin to your OpenCode config.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@falentio/opencode-zedokai"]
}
```

Pick a theme with `/theme`, or pin one in `tui.json`.

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "theme": "zedokai"
}
```

## What the plugin does

OpenCode reads custom themes from `~/.config/opencode/themes/` and `<project>/.opencode/themes/`. There is no npm registry for themes, so the plugin writes its bundled JSON into the project theme directory on startup. When the project directory is not writable, it falls back to `~/.config/opencode/themes/`.

Themes are written with `mkdir` plus overwrite, so repeat runs are safe and updates replace stale files.

## Develop

```sh
pnpm install
pnpm check
```

`pnpm check` runs typecheck, build, and the theme validation tests.

## Regenerate themes

The theme JSON is generated from the upstream Zed theme, not hand-edited. Clone [slymax/zedokai](https://github.com/slymax/zedokai) and run:

```sh
node scripts/generate-themes.mjs /path/to/zedokai/themes/zedokai.json
```

`scripts/generate-themes.mjs` holds the one place where Zed's `syntax.*` keys map onto OpenCode's `syntax*` keys.

## Credits

Zedokai is created by [slymax](https://github.com/slymax) and is based on the [Monokai Pro](https://monokai.pro) color scheme. This package ports those colors to OpenCode.

## License

MIT
