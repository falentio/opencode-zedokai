import { homedir } from "node:os";
import { join } from "node:path";
import type { Plugin } from "@opencode-ai/plugin";
import { installThemes } from "./theme.ts";

const packageRoot = join(import.meta.dirname, "..");

const ZedokaiPlugin: Plugin = async ({ client, directory }) => {
  const projectThemes = join(directory, ".opencode", "themes");
  try {
    const count = installThemes(packageRoot, projectThemes);
    await log(client, "info", "zedokai themes installed", { count, target: projectThemes });
  } catch (error) {
    await log(client, "warn", "project themes not installed, falling back to user themes", {
      error: String(error),
    });
    try {
      const count = installThemes(packageRoot, join(homedir(), ".config", "opencode", "themes"));
      await log(client, "info", "zedokai themes installed", { count, target: "~/.config/opencode/themes" });
    } catch (fallbackError) {
      await log(client, "error", "failed to install zedokai themes", { error: String(fallbackError) });
    }
  }
  return {};
};

async function log(
  client: Parameters<Plugin>[0]["client"],
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>,
) {
  await client.app.log({
    body: { service: "@falentio/opencode-zedokai", level, message, extra },
  });
}

export default ZedokaiPlugin;
