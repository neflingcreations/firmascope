import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Loads key=value pairs from .env.local into process.env for standalone
 * scripts (tsx, not `next dev`) that need OPENROUTER_API_KEY /
 * OPENROUTER_MODEL. Never overwrites a var already set in the environment.
 */
export function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}
