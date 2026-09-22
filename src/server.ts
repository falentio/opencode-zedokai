// opencode v2 server plugin. The package has no server-side behavior, but the
// server loader resolves a `./server` entrypoint and refuses the whole package
// when it finds none. Without this file the loader reports
// "Plugin entrypoint not found" and the TUI never receives the plugin, so the
// themes are never installed.
import type { Plugin } from "@opencode/plugin";

const plugin: Plugin.Plugin = {
  id: "opencode-zedokai",
  setup() {},
};

export default plugin;
