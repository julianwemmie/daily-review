import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".amber-cards");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export interface CliConfig {
  apiKey?: string;
  sessionToken?: string;
  serverUrl: string;
}

const DEFAULT_SERVER_URL = process.env.VITE_APP_URL || "http://localhost:3000";

const defaults: CliConfig = {
  serverUrl: DEFAULT_SERVER_URL,
};

export function loadConfig(): CliConfig {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveConfig(config: Partial<CliConfig>): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const existing = loadConfig();
  const merged = { ...existing, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2) + "\n");
}

export interface AuthCredentials {
  type: "api-key" | "bearer";
  token: string;
}

export function getAuth(optionKey?: string): AuthCredentials {
  // 1. Explicit API key flag
  if (optionKey) return { type: "api-key", token: optionKey };
  // 2. API key env var
  if (process.env.AMBER_CARDS_API_KEY) return { type: "api-key", token: process.env.AMBER_CARDS_API_KEY };

  const config = loadConfig();
  // 3. Saved session token (from OAuth device flow)
  if (config.sessionToken) return { type: "bearer", token: config.sessionToken };
  // 4. Saved API key
  if (config.apiKey) return { type: "api-key", token: config.apiKey };

  console.error(
    "Not authenticated. Log in via:\n" +
    "  amber-cards login          (browser OAuth)\n" +
    "  amber-cards login --api-key (API key)\n" +
    "  AMBER_CARDS_API_KEY env var"
  );
  process.exit(1);
}

export function getServerUrl(optionUrl?: string): string {
  if (optionUrl) return optionUrl;
  if (process.env.AMBER_CARDS_URL) return process.env.AMBER_CARDS_URL;
  return loadConfig().serverUrl;
}
