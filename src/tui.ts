// opencode v2 CLI plugin. It installs the bundled Zedokai themes into the theme
// directory opencode scans, then asks the theme system to re-read it so the
// themes show up in `/themes` without a restart.
//
// `@opencode/plugin/tui` is imported for types only. opencode does not resolve
// that specifier for installed plugins, so a value import would fail at load.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "@opencode/plugin/tui";
import { installThemes, themeTargetDirectory } from "./themes.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const plugin: Plugin.Definition = {
  id: "opencode-zedokai",
  setup(context) {
    const scope = context.options.scope === "project" ? "project" : "global";
    const directory = context.location?.directory ?? process.cwd();
    const written = installThemes(packageRoot, themeTargetDirectory(scope, directory));
    if (written.length === 0) return;
    if (process.platform !== "win32") process.kill(process.pid, "SIGUSR2");
    context.ui.toast.show({
      message: `Zedokai: installed ${written.length} theme${written.length === 1 ? "" : "s"}. Pick one with /themes.`,
      variant: "success",
    });
  },
};

export default plugin;
