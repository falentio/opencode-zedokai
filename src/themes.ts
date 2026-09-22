// Copies the bundled themes into the theme directory opencode reads.
//
// opencode v2 has no manifest field for themes and the plugin API cannot
// register them. It finds themes by scanning `themes/*.json` under the config
// directory and each ancestor `.opencode` directory, so the files have to land
// there.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type ThemeScope = "global" | "project";

function themeSourceDirectory(packageRoot: string): string {
  return join(packageRoot, "themes");
}

// The session directory is where opencode was started, which may be a
// subdirectory of the project. Walk up to the repository root so the project
// scope means the project, not whatever directory the session began in.
export function projectRoot(directory: string): string {
  let current = directory;
  for (;;) {
    if (existsSync(join(current, ".git")) || existsSync(join(current, ".hg"))) return current;
    const parent = dirname(current);
    if (parent === current) return directory;
    current = parent;
  }
}

export function themeTargetDirectory(scope: ThemeScope, directory: string): string {
  if (scope === "project") return join(projectRoot(directory), ".opencode", "themes");
  const configHome = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(configHome, "opencode", "themes");
}

export function bundledThemes(packageRoot: string): string[] {
  return readdirSync(themeSourceDirectory(packageRoot))
    .filter((file) => file.endsWith(".json"))
    .sort();
}

// Returns the file names written. A theme already on disk with identical bytes
// is left alone, so repeated starts do not touch the filesystem.
export function installThemes(packageRoot: string, targetDirectory: string): string[] {
  const source = themeSourceDirectory(packageRoot);
  mkdirSync(targetDirectory, { recursive: true });
  const written: string[] = [];
  for (const file of bundledThemes(packageRoot)) {
    const body = readFileSync(join(source, file));
    const destination = join(targetDirectory, file);
    if (isCurrent(destination, body)) continue;
    writeFileSync(destination, body);
    written.push(file);
  }
  return written;
}

function isCurrent(path: string, body: Buffer): boolean {
  try {
    return readFileSync(path).equals(body);
  } catch {
    return false;
  }
}
